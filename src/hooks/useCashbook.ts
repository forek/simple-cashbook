import { useEffect, useReducer, useRef, createContext } from 'react'
import csvParse from 'csv-parse'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import applyCashbookPipeline from '../utils/pipeline'

// import Decimal from 'decimal.js'

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

  export type Remove = Bill

  export interface Filters {
    col: BillColumns
    value: Bill[keyof Bill] | undefined
  }

  export type Sorter = SorterState

  export interface Pagination {
    current: number
  }
}

type Payload = PayloadTypes.State | PayloadTypes.Import | PayloadTypes.Add | PayloadTypes.Filters | PayloadTypes.Sorter | PayloadTypes.Remove | PayloadTypes.Pagination | null

type CategoriesType = 0 | 1

export interface Bill {
  id?: string
  type: CategoriesType
  time: string
  category: string
  amount: number
}

export interface Categories {
  id: string
  type: CategoriesType
  name: string
}

export interface CategoriesIndex {
  [id: string]: {
    type: Categories['type']
    name: Categories['name']
  }
}

type SortDirection = 'ascend' | 'descend'

type Filters = {
  [col in BillColumns]?: string
}

interface Pagination {
  current: number
  perPage: number
  total: number
}

export type FilterSet = {
  [col in BillColumns]: Bill[col][]
}

type FilterConfig = {
  [col in BillColumns]?: {
    active: boolean
    transform(v: Bill[col]): string
  }
}

interface Sorter {
  col: BillColumns
  direction: SortDirection
  sortFn?(a: string, b: string, direction: SortDirection): number
}

type SorterState = Sorter

export type BillColumns = keyof Bill

export interface BillTable extends Array<Bill> {}

export interface CategoriesTable extends Array<Categories> {}

export interface CashbookState {
  bill: BillTable
  categories: CategoriesTable
  categoriesIndex: CategoriesIndex
  result: BillTable
  filters: Filters
  filterSet: FilterSet
  filterConfig: FilterConfig
  pagination: Pagination
  sorter?: Sorter
  getCache?(): React.MutableRefObject<CashbookCache>
  stageResult: {
    filter: BillTable
    sorter: BillTable
    pagination: BillTable
    statistics: BillTable
  }
  statistics: {
    show: boolean
    revenue: [number, number],
    expenditure: { category: string, amount: number }[]
  }
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

enum t {
  init = 'INIT',
  import = 'IMPORT',
  add = 'ADD',
  remove = 'REOMVE',
  setFilter = 'SET_FILTER',
  setSorter = 'SET_SORTER',
  removeSorter = 'REMOVE_SORTER',
  setPagination = 'SET_PAGE'
}

export const initalState: CashbookState = {
  bill: [],
  categories: [],
  categoriesIndex: {},
  result: [],
  filters: {},
  filterSet: {
    id: [],
    type: [],
    time: [],
    amount: [],
    category: []
  },
  filterConfig: {
    time: {
      active: true,
      transform: v => {
        return moment(parseInt(v)).format('YYYY-MM')
      }
    },
    category: {
      active: true,
      transform: v => v
    }
  },
  pagination: {
    current: 0,
    perPage: 10,
    total: 0
  },
  stageResult: {
    filter: [],
    sorter: [],
    pagination: [],
    statistics: []
  },
  statistics: {
    show: false,
    revenue: [0, 0],
    expenditure: []
  }
}

// Cashbook I/O API
const cashbook = {
  load: () => {
    const bill: BillTable = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_BILL) || '[]')
    const categories: CategoriesTable = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_CATEGORIES) || '[]')
    return { bill, categories }
  },
  import: (type: DataType, blob: Blob) => {
    const parse = (str: string | null) => new Promise((resolve, reject) => {
      if (!str) return resolve(null)
      csvParse(str,
        {
          columns: header => header
        },
        (err, records) => {
          if (err) return reject(err)
          resolve(records)
        })
    })

    return new Promise((resolve, reject) => {
      const reader = new window.FileReader()
      reader.readAsText(blob, 'UTF-8')

      reader.onload = async function (e) {
        switch (type) {
          case 'bill': {
            const data = (await parse(e.target?.result as string | null)) as BillTable | null
            if (!data) return resolve([])
            data.forEach(item => {
              item.amount = parseFloat(item.amount as unknown as string)
              item.type = parseInt(item.type as unknown as string) as CategoriesType
              item.id = uuidv4()
            })
            resolve(data)
            break
          }
          case 'categories': {
            const data = (await parse(e.target?.result as string | null)) as CategoriesTable | null
            if (!data) return resolve([])
            data.forEach(item => {
              item.type = parseInt(item.type as unknown as string) as CategoriesType
            })
            resolve(data)
            break
          }
        }
      }

      reader.onerror = (e) => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(e.target?.error)
      }
    })
  },
  save: (bill: BillTable, categories: CategoriesTable) => {
    window.localStorage.setItem(LOCAL_STORAGE_BILL, JSON.stringify(bill))
    window.localStorage.setItem(LOCAL_STORAGE_CATEGORIES, JSON.stringify(categories))
  }
}

const utils = {
  concatTable<T extends Bill | Categories> (state: CashbookState, key: DataType, data: T | T[]) {
    return {
      ...state,
      [key]: (state[key] as T[]).concat(data as T | T[])
    }
  },
  createCategoriesIndex (state: CashbookState) {
    state.categoriesIndex = state.categories.reduce((pre, v) => {
      pre[v.id] = { type: v.type, name: v.name }
      return pre
    }, {} as CategoriesIndex)
    return state
  }
}

function reducer (state: CashbookState, action: CashbookAction<Payload>): CashbookState {
  switch (action.type) {
    case t.init: {
      return applyCashbookPipeline(utils.createCategoriesIndex(action.payload as PayloadTypes.State))
    }

    case t.import: {
      const p = action.payload as PayloadTypes.Import
      switch (p.importType) {
        case 'bill': return applyCashbookPipeline(utils.concatTable<Bill>(state, 'bill', p.data as BillTable))
        case 'categories': {
          return (
            utils.createCategoriesIndex(
              utils.concatTable<Categories>(state, 'categories', p.data as CategoriesTable)
            )
          )
        }
        default: return state
      }
    }

    case t.add: {
      const p = action.payload as PayloadTypes.Add
      switch (p.dataType) {
        case 'bill': return applyCashbookPipeline(utils.concatTable<Bill>(state, 'bill', p.data as Bill))
        case 'categories': return utils.concatTable<Categories>(state, 'categories', p.data as Categories)
        default: return state
      }
    }

    case t.remove: {
      const record = action.payload as PayloadTypes.Remove
      const { bill } = state
      const index = bill.findIndex(item => item.id === record.id)
      if (index >= 0) {
        const nextState = { ...state }
        nextState.bill = [...nextState.bill]
        nextState.bill.splice(index, 1)
        return applyCashbookPipeline(nextState)
      } else {
        return state
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

      return applyCashbookPipeline(nextState)
    }

    case t.setSorter: {
      const nextState = { ...state, sorter: action.payload as PayloadTypes.Sorter }
      return applyCashbookPipeline(nextState, 'sorter')
    }

    case t.removeSorter: {
      const nextState = { ...state }
      delete nextState.sorter
      return applyCashbookPipeline(nextState, 'sorter')
    }

    case t.setPagination: {
      const nextState = { ...state }
      const p = action.payload as PayloadTypes.Pagination
      nextState.pagination = { ...nextState.pagination, current: p.current }
      return applyCashbookPipeline(nextState, 'pagination')
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
      if (type === 'bill' && !data.id) data.id = uuidv4()
      dispatch({ type: t.add, payload: { dataType: type, data } })
    },
    remove (record: Bill) {
      dispatch({ type: t.remove, payload: record })
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
    },
    setPagination (current: number) {
      dispatch({ type: t.setPagination, payload: { current } })
    }
  }
}

interface CashbookContextType {
  actions?: ReturnType<typeof createActions>,
  state?: CashbookState,
  io?: typeof cashbook
}

export const CashbookContext = createContext<CashbookContextType>({})

function useCashbook () {
  const iState = { ...initalState }
  iState.getCache = () => cache

  const cache = useRef({} as CashbookCache)
  const [state, dispatch] = useReducer(reducer, iState)
  const actions = createActions(dispatch)

  useEffect(() => {
    const data = cashbook.load()
    actions.init({ ...iState, ...data })
  }, [])

  return { actions, state, io: cashbook }
}

export default useCashbook
