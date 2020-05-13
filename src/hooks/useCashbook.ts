import { useEffect, useReducer, useRef } from 'react'

const LOCAL_STORAGE_BILL = 'simple_cashbook_bill_data'
const LOCAL_STORAGE_CATEGORIES = 'simple_cashbook_categories_data'

declare namespace PayloadTypes {
  export type State = CashbookState

  export interface Import {
    importType: DataType
    data: BillTable | CategoriesTable
  }

  export interface Add {
    dataType: DataType
    data: Bill | Categories
  }

  export interface Filters {
    col: BillColumns
    value: number | string | undefined
  }

  export type Sorter = SorterState
}

type Payload = PayloadTypes.State | PayloadTypes.Import | PayloadTypes.Add | PayloadTypes.Filters | PayloadTypes.Sorter | null

interface Bill {
  type: number
  time: string
  category: string
  amount: number
}

interface Categories {
  id: string
  type: string
  name: string
}

type SortDirection = 'ascend' | 'descend'

type Filters = {
  [col in BillColumns]?: string
}

interface Sorter {
  col: BillColumns
  direction: SortDirection
  sortFn?(a: string, b: string, direction: SortDirection): number
}

type SorterState = Sorter

type BillColumns = 'type' | 'time' | 'category' | 'amount'

interface BillTable extends Array<Bill> {}

interface CategoriesTable extends Array<Categories> {}

interface CashbookState {
  bill: BillTable
  categories: CategoriesTable
  result: BillTable
  filters: Filters
  sorter?: Sorter
  getCache?(): React.MutableRefObject<CashbookCache>
}

interface CashbookAction<T> {
  type: string
  payload: T
}

interface CashbookCache {
  filtersResult?: BillTable
  sorterResult?: BillTable
}

type DataType = 'bill' | 'categories'

type TriggerType = 'filters' | 'sorter' | 'pagination'

enum t {
  init = 'INIT',
  import = 'IMPORT',
  add = 'ADD',
  setFilter = 'SET_FILTER',
  setSorter = 'SET_SORTER',
  removeSorter = 'REMOVE_SORTER'
}

const initalState: CashbookState = {
  bill: [],
  categories: [],
  result: [],
  filters: {}
}

// Cashbook I/O API
const cashbook = {
  load: () => {
    const bill: BillTable = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_BILL) || '[]')
    const categories: CategoriesTable = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_CATEGORIES) || '[]')
    return { bill, categories }
  },
  import: (type: DataType, blob: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader()
      reader.readAsText(blob, 'UTF-8')

      reader.onload = function (e) {
        switch (type) {
          case 'bill': resolve(e.target?.result as BillTable | null); break
          case 'categories': resolve(e.target?.result as CategoriesTable | null); break
        }
      }

      reader.onerror = (e) => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(e.target?.error)
      }
    })
  }
}

const utils = {
  updateTable<T extends Bill | Categories> (state: CashbookState, key: DataType, data: T | T[]) {
    return {
      ...state,
      [key]: (state[key] as T[]).concat(data as T | T[])
    }
  },
  applyFSP (state: CashbookState, type: TriggerType = 'filters') {
    const { bill, filters, sorter, getCache } = state

    let result = bill.filter(item => {
      for (const key in filters) {
        const el = filters[key as BillColumns]
        if (typeof el === 'undefined') continue
        if (item[key as BillColumns] !== el) return false
      }

      return true
    })

    if (sorter) {
      result = result.sort((a, b) => {
        if (sorter.sortFn) {
          return sorter.sortFn(a[sorter.col] as string, b[sorter.col] as string, sorter.direction)
        }

        switch (sorter.direction) {
          case 'ascend': return a[sorter.col] as number - (b[sorter.col] as number)
          case 'descend': return b[sorter.col] as number - (a[sorter.col] as number)
        }
      })
    }

    state.result = result

    return state
  }
}

function reducer (state: CashbookState, action: CashbookAction<Payload>): CashbookState {
  switch (action.type) {
    case t.init: {
      return action.payload as PayloadTypes.State
    }

    case t.import: {
      const p = action.payload as PayloadTypes.Import
      switch (p.importType) {
        case 'bill': return utils.applyFSP(utils.updateTable<Bill>(state, 'bill', p.data as BillTable))
        case 'categories': return utils.updateTable<Categories>(state, 'categories', p.data as CategoriesTable)
        default: return state
      }
    }

    case t.add: {
      const p = action.payload as PayloadTypes.Add
      switch (p.dataType) {
        case 'bill': return utils.applyFSP(utils.updateTable<Bill>(state, 'bill', p.data as Bill))
        case 'categories': return utils.updateTable<Categories>(state, 'categories', p.data as Categories)
        default: return state
      }
    }

    case t.setFilter: {
      const p = action.payload as PayloadTypes.Filters
      const { filters } = state

      const nextState = {
        ...state,
        filters: {
          ...filters,
          [p.col]: p.value
        }
      }

      return utils.applyFSP(nextState)
    }

    case t.setSorter: {
      const nextState = { ...state, sorter: action.payload as PayloadTypes.Sorter }
      return utils.applyFSP(nextState, 'sorter')
    }

    case t.removeSorter: {
      const nextState = { ...state }
      delete nextState.sorter
      return utils.applyFSP(nextState, 'sorter')
    }

    default:
      return state
  }
}

function createActions (dispatch: React.Dispatch<CashbookAction<Payload>>) {
  return {
    init (state: CashbookState) {
      dispatch({ type: t.init, payload: state })
    },
    import (type: DataType, data: BillTable | CategoriesTable) {
      dispatch({ type: t.import, payload: { importType: type, data } })
    },
    add (type: DataType, data: Bill | Categories) {
      dispatch({ type: t.add, payload: { dataType: type, data } })
    },
    setFilter<T extends BillColumns> (col: T, value: Bill[T]) {
      dispatch({ type: t.setFilter, payload: { col, value } })
    },
    setSorter (col: BillColumns, direction: SortDirection, sortFn?: Sorter['sortFn']) {
      dispatch({ type: t.setSorter, payload: { col, direction, sortFn } })
    },
    removeFilter (col: BillColumns) {
      dispatch({ type: t.setFilter, payload: { col, value: undefined } })
    },
    removeSorter () {
      dispatch({ type: t.removeSorter, payload: null })
    }
  }
}

function useCashbook () {
  const iState = { ...initalState }
  iState.getCache = () => cache

  const cache = useRef({} as CashbookCache)
  const [state, dispatch] = useReducer(reducer, iState)
  const actions = createActions(dispatch)

  useEffect(() => {
    const data = cashbook.load()
    actions.init({ ...data, result: [], filters: {} })
  }, [])

  return { actions, state, io: cashbook }
}

export default useCashbook
