import { initalState, CashbookState, BillColumns, FilterSet, BillTable } from '../hooks/useCashbook'

type StageType = 'filter' | 'sorter' | 'pagination' | 'statistics'

interface StageResult {
  type?: StageType
  state: CashbookState
  result: BillTable
}

interface PipelineFunc {
  (state: CashbookState, lastResult: BillTable, stageResult: StageResult[]): StageResult
}

type PipelineConfig = {
  [key in StageType]: PipelineFunc[]
}

const applyFilter: PipelineFunc = (state, lastResult) => {
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

  const result = lastResult.filter(item => {
    for (const fkey in filterConfig) {
      const key = fkey as BillColumns
      if (filterConfig[key]?.active) {
        const result = filterConfig[key]?.transform(item[key] as never)
        if (result) {
          if (filterSetCache[key][result]) {
            continue
          } else {
            nextFilterSet[key].push(result as never)
            filterSetCache[key][result] = true
          }
        }
      }
    }

    let flag = true
    for (const fkey in filters) {
      const key = fkey as BillColumns
      const el = filters[key]
      if (typeof el === 'undefined' || !el) continue
      flag = flag && (filterConfig[key] ? filterConfig[key]?.transform(item[key] as never) : item[key]) === el
    }

    return flag
  })

  state.filterSet = nextFilterSet
  return { type: 'filter', state, result }
}

const applySorter: PipelineFunc = (state, lastResult) => {
  const { sorter } = state
  if (!sorter) return { type: 'sorter', state, result: state.result }
  const result = lastResult.sort((a, b) => {
    if (sorter.sortFn) {
      return sorter.sortFn(a[sorter.col] as string, b[sorter.col] as string, sorter.direction)
    }

    switch (sorter.direction) {
      case 'ascend': return a[sorter.col] as number - (b[sorter.col] as number)
      case 'descend': return b[sorter.col] as number - (a[sorter.col] as number)
    }
  })

  return { type: 'sorter', state, result }
}

const applyPagination: PipelineFunc = (state, lastResult) => {
  state.pagination = { ...state.pagination, total: lastResult.length }
  let pageStart = state.pagination.perPage * (state.pagination.current)
  if (pageStart >= lastResult.length) {
    state.pagination.current = 0
    pageStart = 0
  }
  const result = lastResult.slice(pageStart, pageStart + state.pagination.perPage)

  return { type: 'pagination', state, result }
}

const applyStatistics: PipelineFunc = (state, lastResult) => {
  return { type: 'statistics', state: state, result: lastResult }
}

function getStageResult (type: StageType): PipelineFunc {
  const fn: PipelineFunc = (state) => {
    return { type, state, result: state.stageResult[type] }
  }

  return fn
}

const pipelineConfig: PipelineConfig = {
  filter: [applyFilter, applySorter, applyPagination, applyStatistics],
  sorter: [getStageResult('filter'), applySorter, applyPagination, applyStatistics],
  pagination: [getStageResult('sorter'), applyPagination, applyStatistics],
  statistics: [getStageResult('pagination'), applyStatistics]
}

export default function CashbookPipeline (state: CashbookState, startPoint: StageType = 'filter'): CashbookState {
  const config = pipelineConfig[startPoint]

  const { state: nextState, stageResult } = config.reduce((pre, fn) => {
    const lastResult = pre.stageResult.length > 0 ? pre.stageResult[pre.stageResult.length - 1].result : state.bill

    const r = fn(state, lastResult, pre.stageResult)
    r.state.result = r.result

    return { state: r.state, stageResult: pre.stageResult.concat(r) }
  }, { state, stageResult: [] as StageResult[] })

  stageResult.forEach(item => {
    if (!item.type) return
    nextState.stageResult[item.type] = item.result
  })

  return nextState
}
