import { useEffect, useReducer, createContext } from 'react'
import csvParse from 'csv-parse'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import applyCashbookPipeline, { StageType, StageResult } from '../utils/pipeline'
import cache from '../utils/cache'

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
    data: Bill | Category
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

  export interface Random {
    count: number
  }
}

type Payload = PayloadTypes.Random | PayloadTypes.State | PayloadTypes.Import | PayloadTypes.Add | PayloadTypes.Filters | PayloadTypes.Sorter | PayloadTypes.Remove | PayloadTypes.Pagination | null

type CategoriesType = 0 | 1

export interface Bill {
  id?: string
  type: CategoriesType
  time: string
  category: string
  amount: number
}

export interface Category {
  id: string
  type: CategoriesType
  name: string
}

export interface CategoriesIndex {
  [id: string]: {
    type: Category['type']
    name: Category['name']
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
  [col in BillColumns]: { value: Bill[col], count: number }[]
}

type FilterConfig = {
  [col in BillColumns]?: {
    active: boolean
    transform?(v: Bill[col]): string
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

export interface CategoriesTable extends Array<Category> {}

export interface CashbookState {
  bill: BillTable
  categories: CategoriesTable
  categoriesIndex: CategoriesIndex
  display: BillTable
  filters: Filters
  filterSet: FilterSet
  filterConfig: FilterConfig
  pagination: Pagination
  sorter?: Sorter
  getCache?(): React.MutableRefObject<CashbookCache>
  stageResult: {
    [key in StageType]: {
      state: StageResult['state']
      result: StageResult['result']
    }
  }
  statistics: {
    show: boolean
    revenue: [string, string],
    expenditure: { category: string, amount: string }[]
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
  setPagination = 'SET_PAGE',
  random = 'CREATE_RANDOM_DATA'
}

export const initalState: CashbookState = {
  bill: [],
  categories: [],
  categoriesIndex: {},
  display: [],
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
        if (!(v in cache.transformTime)) cache.transformTime[v] = moment(parseInt(v)).format('YYYY-MM')
        return cache.transformTime[v]
      }
    },
    category: {
      active: true
    }
  },
  pagination: {
    current: 0,
    perPage: 10,
    total: 0
  },
  stageResult: {
    initFilter: { state: undefined, result: {} },
    filter: { state: undefined, result: [] },
    pagination: { state: undefined, result: [] },
    statistics: {
      state: undefined,
      result: {
        show: false,
        revenue: ['0', '0'],
        expenditure: []
      }
    }
  },
  statistics: {
    show: false,
    revenue: ['0', '0'],
    expenditure: []
  }
}

// Cashbook I/O API
export const io = {
  load: () => {
    const bill: BillTable = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_BILL) || '[]')
    const categories: CategoriesTable = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_CATEGORIES) || '[]')
    return { bill, categories }
  },
  import: (type: DataType, blob: Blob) => {
    const parse = (str: string | null, expectHeader: string) => new Promise((resolve, reject) => {
      if (!str) return resolve(null)
      let tmpHeader = ''
      csvParse(str,
        {
          columns: header => {
            tmpHeader = header.join(',')
            return header
          }
        },
        (err, records) => {
          if (err) return reject(err)
          if (expectHeader !== tmpHeader) return reject(new Error('格式错误'))
          resolve(records)
        })
    })

    return new Promise((resolve, reject) => {
      const reader = new window.FileReader()
      reader.readAsText(blob, 'UTF-8')

      reader.onload = async function (e) {
        try {
          switch (type) {
            case 'bill': {
              const data = (await parse(e.target?.result as string | null, 'type,time,category,amount')) as BillTable | null
              if (!data) return resolve([])
              data.forEach(item => {
                item.amount = parseFloat(item.amount as unknown as string)
                item.type = parseInt(item.type as unknown as string) as CategoriesType
                item.id = utils.getUniqueUUID()
              })
              resolve(data)
              break
            }
            case 'categories': {
              const data = (await parse(e.target?.result as string | null, 'id,type,name')) as CategoriesTable | null
              if (!data) return resolve([])
              data.forEach(item => {
                item.type = parseInt(item.type as unknown as string) as CategoriesType
              })
              resolve(data)
              break
            }
          }
        } catch (error) {
          reject(error)
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
  },
  clearAndSave: () => {
    window.localStorage.clear()
    window.location.reload()
  }
}

const utils = {
  concatTable<T extends Bill | Category> (state: CashbookState, key: DataType, data: T | T[]) {
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
  },
  getUniqueUUID () {
    let uuid = ''
    do { uuid = uuidv4() } while (cache.billIds[uuid])
    cache.billIds[uuid] = true
    return uuid
  },
  buildIdsCache (data: BillTable) {
    data.forEach(item => {
      if (item.id) cache.billIds[item.id] = true
    })
  },
  random (num: number) {
    return Math.floor(Math.random() * num)
  }
}

export function reducer (state: CashbookState, action: CashbookAction<Payload>): CashbookState {
  switch (action.type) {
    case t.init: {
      return applyCashbookPipeline(
        utils.createCategoriesIndex(action.payload as PayloadTypes.State),
        'initFilter',
        {
          initFilter: {
            type: 'add',
            data: (action.payload as PayloadTypes.State).bill
          }
        }
      )
    }

    case t.import: {
      const p = action.payload as PayloadTypes.Import
      switch (p.importType) {
        case 'bill': return applyCashbookPipeline(
          utils.concatTable<Bill>(state, 'bill', p.data as BillTable),
          'initFilter',
          {
            initFilter: {
              type: 'add',
              data: p.data as BillTable
            }
          }
        )
        case 'categories': {
          return (
            utils.createCategoriesIndex(
              utils.concatTable<Category>(state, 'categories', p.data as CategoriesTable)
            )
          )
        }
        default: return state
      }
    }

    case t.add: {
      const p = action.payload as PayloadTypes.Add
      switch (p.dataType) {
        case 'bill': {
          return applyCashbookPipeline(
            utils.concatTable<Bill>(state, 'bill', p.data as Bill),
            'initFilter',
            {
              initFilter: {
                type: 'add',
                data: [p.data as Bill]
              }
            }
          )
        }
        case 'categories': return utils.concatTable<Category>(state, 'categories', p.data as Category)
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
        const deleted = nextState.bill.splice(index, 1)
        return applyCashbookPipeline(
          nextState,
          'initFilter',
          {
            initFilter: {
              type: 'remove',
              data: deleted
            }
          }
        )
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

      return applyCashbookPipeline(nextState, 'filter', undefined)
    }

    case t.setPagination: {
      const nextState = { ...state }
      const p = action.payload as PayloadTypes.Pagination
      nextState.pagination = { ...nextState.pagination, current: p.current }
      return applyCashbookPipeline(nextState, 'pagination', undefined)
    }

    case t.random: {
      const { count } = action.payload as PayloadTypes.Random
      const { bill, categories } = state
      const vBillTable: BillTable = []

      for (let i = 0; i < count; i++) {
        vBillTable.push({
          id: utils.getUniqueUUID(),
          type: utils.random(2) as 0 | 1,
          category: categories[utils.random(categories.length)].id,
          time: bill[utils.random(bill.length)].time,
          amount: utils.random(30000)
        })
      }

      return applyCashbookPipeline(
        utils.concatTable<Bill>(state, 'bill', vBillTable),
        'initFilter',
        {
          initFilter: {
            type: 'add',
            data: vBillTable
          }
        }
      )
    }

    default:
      return state
  }
}

export function createActions (dispatch: React.Dispatch<CashbookAction<Payload>>) {
  return {
    init (state: CashbookState) {
      utils.buildIdsCache(state.bill)
      dispatch({ type: t.init, payload: state })
    },
    import (type: DataType, data: BillTable | CategoriesTable) {
      if (type === 'bill') utils.buildIdsCache(data as BillTable)
      dispatch({ type: t.import, payload: { importType: type, data } })
    },
    add (type: DataType, data: Bill | Category) {
      if (type === 'bill' && !data.id) {
        data.id = utils.getUniqueUUID()
      }
      dispatch({ type: t.add, payload: { dataType: type, data } })
    },
    remove (record: Bill) {
      dispatch({ type: t.remove, payload: record })
    },
    setFilter<T extends BillColumns> (col: T, value: Bill[T]) {
      dispatch({ type: t.setFilter, payload: { col, value } })
    },
    removeFilter (col: BillColumns) {
      dispatch({ type: t.setFilter, payload: { col, value: undefined } })
    },
    setPagination (current: number) {
      dispatch({ type: t.setPagination, payload: { current } })
    },
    createRandomBillTable (count: number) {
      dispatch({ type: t.random, payload: { count } })
    }
  }
}

export interface CashbookContextType {
  actions?: ReturnType<typeof createActions>,
  state?: CashbookState,
  io?: typeof io
}

export const CashbookContext = createContext<CashbookContextType>({})

function useCashbook () {
  const iState = { ...initalState }

  const [state, dispatch] = useReducer(reducer, iState)
  const actions = createActions(dispatch)

  useEffect(() => {
    const data = io.load()
    actions.init({ ...iState, ...data })
    cache.billIds = {}
    return () => {
      cache.billIds = {}
    }
  }, [])

  return { actions, state, io: io }
}

export default useCashbook
