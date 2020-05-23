/* eslint-disable no-undef */
import { CashbookState, BillColumns, FilterSet, BillTable } from '../hooks/useCashbook'
import cache from '../utils/cache'
import Decimal from 'decimal.js'

export type StageType = 'initFilter' | 'filter' | 'pagination' | 'statistics'

interface ExtraData {
  initFilter?: {
    type: 'add' | 'remove',
    data: BillTable
  }
}

type FilterResult = {
  [key in BillColumns]?: BillTable
}

export interface StageResult {
  type?: StageType
  state?: Partial<CashbookState>
  result: BillTable | FilterResult | CashbookState['statistics'] | CashbookState['filterSet']
}

interface PipelineUpdateFunc {
  (state: Partial<CashbookState>): void
}

interface PipelineFunc {
  (state: CashbookState, update: PipelineUpdateFunc, stageResult: StageResult[], extraData: ExtraData | undefined): StageResult
}

type PipelineConfig = {
  [key in StageType]: PipelineFunc[]
}

const filterOrder: Array<BillColumns> = ['time', 'category', 'type']

const applyInitFilter: PipelineFunc = (state, update, _, extraData) => {
  const { filterConfig } = state
  const billTable = extraData?.initFilter ? extraData.initFilter.data : state.bill

  const nextFilterSet: FilterSet = { ...state.filterSet }

  for (let i = 0; i < billTable.length; i++) {
    const bill = billTable[i]
    for (let j = 0; j < filterOrder.length; j++) {
      const filter = filterOrder[j]
      const fc = filterConfig[filter]
      if (!fc || !fc.active) continue

      let result = bill[filter] as string
      if (fc.transform) {
        result = cache.transformTime[result] || fc.transform(result as never)
      }

      if (!result) continue
      const fs = nextFilterSet[filter] as { value: string, count: number }[]
      const fsResult = fs.find(item => item.value === result)

      if (extraData?.initFilter?.type === 'add') {
        if (!fsResult) {
          fs.push({ value: result, count: 1 })
        } else {
          fsResult.count += 1
        }
      } else if (extraData?.initFilter?.type === 'remove') {
        if (fsResult) fsResult.count -= 1
      }
    }
  }

  update({ filterSet: nextFilterSet })

  return { type: 'initFilter', result: nextFilterSet }
}

const applyFilter: PipelineFunc = (state, update) => {
  const { filters, filterConfig } = state

  const result: FilterResult = {}
  const activeFilters = filterOrder.filter(f => f in filters && typeof filters[f] !== 'undefined')
  let billTable = state.bill

  for (let i = 0; i < activeFilters.length; i++) {
    const v = activeFilters[i]
    const list = []
    for (let j = 0; j < billTable.length; j++) {
      const item = billTable[j]
      const fc = filterConfig[v]
      let result = item[v] as string
      if (fc && fc.transform) {
        result = cache.transformTime[result] || fc.transform(result as never)
      }
      if (result === filters[v]) list.push(item)
    }
    result[v] = billTable = list
  }

  update({ display: billTable })

  return { type: 'filter', result: result }
}

const applyPagination: PipelineFunc = (state, update) => {
  const lastDisplay = state.display
  const pagination = { ...state.pagination, total: lastDisplay.length }

  let pageStart = pagination.perPage * (pagination.current)
  if (pageStart >= lastDisplay.length) {
    pagination.current = 0
    pageStart = 0
  }

  const result = lastDisplay.slice(pageStart, pageStart + pagination.perPage)

  update({ pagination, display: result })

  return { type: 'pagination', result }
}

const toDecimal = (amout: number | string) => {
  if (!cache.decimalSet[amout]) cache.decimalSet[amout] = new Decimal(amout)
  return new Decimal(amout)
}

const applyStatistics: PipelineFunc = (state, update, stageResult) => {
  const filterResult = stageResult.find(item => item.type === 'filter') as StageResult | null
  const stage = filterResult?.result as FilterResult | undefined

  if (!stage || !stage.time) {
    const result = {
      show: false,
      revenue: ['0', '0'] as [string, string],
      expenditure: []
    }

    update({ statistics: result })

    return { type: 'statistics', result }
  }

  const revenue = [toDecimal(0), toDecimal(0)] as [Decimal, Decimal]
  const tmp = {} as { [key: string]: Decimal }

  stage.time.forEach(item => {
    revenue[item.type] = revenue[item.type].add(toDecimal(item.amount))
    if (item.type === 0) {
      tmp[item.category] = (tmp[item.category] instanceof Decimal ? tmp[item.category] : toDecimal(0)).add(toDecimal(item.amount))
    }
  })

  const arr = [] as CashbookState['statistics']['expenditure']
  for (const key in tmp) {
    const amount = tmp[key]
    arr.push({ category: key, amount: amount.toString() })
  }

  arr.sort((a, b) => toDecimal(a.amount).sub(toDecimal(b.amount)).toNumber())

  const statistics = {
    show: true,
    expenditure: arr,
    revenue: revenue.map(d => d.toString()) as [string, string]
  }

  update({ statistics })

  return { type: 'statistics', state, result: statistics }
}

function skipStage (type: StageType): PipelineFunc {
  const fn: PipelineFunc = (state, update) => {
    const obj = state.stageResult[type]
    update(obj.state as Partial<CashbookState>)
    return { type, result: obj.result }
  }

  return fn
}

const pipelineConfig: PipelineConfig = {
  initFilter: [applyInitFilter, applyFilter, applyPagination, applyStatistics],
  filter: [skipStage('initFilter'), applyFilter, applyPagination, applyStatistics],
  pagination: [skipStage('filter'), applyPagination],
  statistics: [skipStage('filter'), skipStage('pagination'), applyStatistics]
}

export default function CashbookPipeline (state: CashbookState, startPoint: StageType = 'initFilter', extraData: ExtraData | undefined): CashbookState {
  const config = pipelineConfig[startPoint]

  const { state: nextState, stageResult } = config.reduce((pre, fn) => {
    const cacheState: Partial<CashbookState> = {}

    const update: PipelineUpdateFunc = (state) => {
      Object.assign(cacheState, state)
    }

    const r = fn(state, update, pre.stageResult, extraData)

    Object.assign(state, cacheState)

    r.state = cacheState

    return { state, stageResult: pre.stageResult.concat(r) }
  }, { state, stageResult: [] as StageResult[] })

  stageResult.forEach(item => {
    if (!item.type) return
    nextState.stageResult[item.type] = { result: item.result, state: item.state }
  })

  return nextState
}
