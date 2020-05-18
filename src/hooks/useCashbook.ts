import { useEffect, useReducer, useRef, createContext } from 'react'
import csvParse from 'csv-parse'
import { v4 as uuidv4 } from 'uuid'
import { type } from 'os'

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
}

type Payload = PayloadTypes.State | PayloadTypes.Import | PayloadTypes.Add | PayloadTypes.Filters | PayloadTypes.Sorter | PayloadTypes.Remove | null

type CategoriesType = 0 | 1

export interface Bill {
  id: string
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

interface Sorter {
  col: BillColumns
  direction: SortDirection
  sortFn?(a: string, b: string, direction: SortDirection): number
}

type SorterState = Sorter

type BillColumns = keyof Bill

export interface BillTable extends Array<Bill> {}

export interface CategoriesTable extends Array<Categories> {}

interface CashbookState {
  bill: BillTable
  categories: CategoriesTable
  categoriesIndex: CategoriesIndex
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
  remove = 'REOMVE',
  setFilter = 'SET_FILTER',
  setSorter = 'SET_SORTER',
  removeSorter = 'REMOVE_SORTER'
}

const initalState: CashbookState = {
  bill: [],
  categories: [],
  categoriesIndex: {},
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
  }
}

const utils = {
  concatTable<T extends Bill | Categories> (state: CashbookState, key: DataType, data: T | T[]) {
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
        case 'bill': return utils.applyFSP(utils.concatTable<Bill>(state, 'bill', p.data as BillTable))
        case 'categories': {
          const nextState = utils.concatTable<Categories>(state, 'categories', p.data as CategoriesTable)
          nextState.categoriesIndex = nextState.categories.reduce((pre, v) => {
            pre[v.id] = { type: v.type, name: v.name }
            return pre
          }, {} as CategoriesIndex)
          return nextState
        }
        default: return state
      }
    }

    case t.add: {
      const p = action.payload as PayloadTypes.Add
      switch (p.dataType) {
        case 'bill': return utils.applyFSP(utils.concatTable<Bill>(state, 'bill', p.data as Bill))
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
        return utils.applyFSP(nextState)
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
    actions.init({ ...data, result: [], filters: {}, categoriesIndex: {} })
  }, [])

  return { actions, state, io: cashbook }
}

export default useCashbook
