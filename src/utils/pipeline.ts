/* eslint-disable no-undef */
import { initalState, CashbookState, BillColumns, FilterSet, BillTable } from '../hooks/useCashbook'
import Decimal from 'decimal.js'

export type StageType = 'filter' | 'pagination' | 'statistics'

type FilterResult = {
  [key in BillColumns]?: BillTable
}

export interface StageResult {
  type?: StageType
  state?: Partial<CashbookState>
  result: BillTable | FilterResult | CashbookState['statistics']
}

interface PipelineUpdateFunc {
  (state: Partial<CashbookState>): void
}

interface PipelineFunc {
  (state: CashbookState, update: PipelineUpdateFunc, stageResult: StageResult[]): StageResult
}

type PipelineConfig = {
  [key in StageType]: PipelineFunc[]
}

const filterOrder: Array<BillColumns> = ['time', 'category', 'type']

const applyFilter: PipelineFunc = (state, update) => {
  const { filters, filterConfig } = state

  const filterSetCache = { id: {}, time: {}, type: {}, category: {}, amount: {} } as {
    [col in BillColumns]: {
      [key: string]: boolean
    }
  }

  const nextFilterSet: FilterSet = { ...initalState.filterSet }
  Object.keys(nextFilterSet).forEach(key => {
    nextFilterSet[key as BillColumns] = []
  })

  state.bill.forEach(item => {
    for (const fkey in filterConfig) {
      const key = fkey as BillColumns
      if (!filterConfig[key]?.active) continue

      const result = filterConfig[key]?.transform(item[key] as never)

      if (!result || filterSetCache[key][result]) continue

      nextFilterSet[key].push(result as never)
      filterSetCache[key][result] = true
    }
  })

  const result: FilterResult = {}

  const billTable = filterOrder.filter(f => f in filters && typeof filters[f] !== 'undefined').reduce((pre, v) => {
    const el = filters[v] as string
    const list = pre.filter(item => {
      return (filterConfig[v] ? filterConfig[v]?.transform(item[v] as never) : item[v]) === el
    })

    result[v] = list

    return list
  }, state.bill)

  update({ display: billTable, filterSet: nextFilterSet })

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

const applyStatistics: PipelineFunc = (state, update, stageResult) => {
  const filterResult = stageResult.find(item => item.type === 'filter') as StageResult | null
  const stage = filterResult?.result as FilterResult | undefined

  if (!stage || !stage.time) {
    const result = {
      show: false,
      revenue: [0, 0] as [number, number],
      expenditure: []
    }

    update({ statistics: result })

    return { type: 'statistics', result }
  }

  const revenue = [0, 0] as [number, number]
  const tmp = {} as { [key: string]: number }

  stage.time.forEach(item => {
    revenue[item.type] += item.amount
    if (item.type === 0) {
      tmp[item.category] = (typeof tmp[item.category] === 'number' ? tmp[item.category] : 0) + item.amount
    }
  })

  const arr = [] as CashbookState['statistics']['expenditure']
  for (const key in tmp) {
    const amount = tmp[key]
    arr.push({ category: key, amount: amount })
  }
  arr.sort((a, b) => a.amount - b.amount)

  const statistics = {
    show: true,
    expenditure: arr,
    revenue: revenue
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
  filter: [applyFilter, applyPagination, applyStatistics],
  pagination: [skipStage('filter'), applyPagination, applyStatistics],
  statistics: [skipStage('filter'), skipStage('pagination'), applyStatistics]
}

export default function CashbookPipeline (state: CashbookState, startPoint: StageType = 'filter'): CashbookState {
  const config = pipelineConfig[startPoint]

  const { state: nextState, stageResult } = config.reduce((pre, fn) => {
    const cacheState: Partial<CashbookState> = {}

    const update: PipelineUpdateFunc = (state) => {
      Object.assign(cacheState, state)
    }

    const r = fn(state, update, pre.stageResult)

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
