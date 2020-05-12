import { useEffect, useReducer } from 'react'

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
}

type Payload = PayloadTypes.State | PayloadTypes.Import | PayloadTypes.Add

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

interface BillTable extends Array<Bill> {}

interface CategoriesTable extends Array<Categories> {}

interface CashbookState {
  bill: BillTable
  categories: CategoriesTable
}

interface CashbookAction<T> {
  type: string
  payload: T
}

type DataType = 'bill' | 'categories'

enum t {
  init = 'INIT',
  import = 'IMPORT',
  add = 'ADD'
}

const initalState: CashbookState = {
  bill: [],
  categories: []
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
        case 'bill': return utils.updateTable<Bill>(state, 'bill', p.data as BillTable)
        case 'categories': return utils.updateTable<Categories>(state, 'categories', p.data as CategoriesTable)
        default: return state
      }
    }

    case t.add: {
      const p = action.payload as PayloadTypes.Add
      switch (p.dataType) {
        case 'bill': return utils.updateTable<Bill>(state, 'bill', p.data as Bill)
        case 'categories': return utils.updateTable<Categories>(state, 'categories', p.data as Categories)
        default: return state
      }
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
    }
  }
}

function useCashbook () {
  const [state, dispatch] = useReducer(reducer, initalState)
  const actions = createActions(dispatch)

  useEffect(() => {
    const data = cashbook.load()
    actions.init(data)
  }, [])

  return { actions, state, io: cashbook }
}

export default useCashbook
