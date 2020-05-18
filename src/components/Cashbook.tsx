import React, { useContext } from 'react'
import { CashbookContext, Bill, BillTable, CategoriesTable, CategoriesIndex } from '../hooks/useCashbook'
import ImportButton from './ImportButton'
import Table from './Table'
import moment from 'moment'

const billColumns = [
  {
    title: '时间',
    dataIndex: 'time' as keyof Bill,
    key: 'time',
    render: (value: Bill['time']) => {
      return moment(parseInt(value)).format('YYYY-MM-DD HH:mm')
    }
  },
  {
    title: '类型',
    dataIndex: 'type' as keyof Bill,
    key: 'type',
    render: (value: Bill['type']) => {
      if (value === 0) return '支出'
      if (value === 1) return '收入'
      return false
    }
  },
  {
    title: '分类',
    dataIndex: 'category' as keyof Bill,
    key: 'category',
    render: (value: Bill['category'], _: Bill, extraData: ColExDataType) => {
      const { categoriesIndex } = extraData
      if (!categoriesIndex) return value
      return categoriesIndex[value]?.name
    }
  },
  {
    title: '金额',
    dataIndex: 'amount' as keyof Bill,
    key: 'amount'
  },
  {
    title: '操作',
    key: 'op',
    render: (v: null, record: Bill, extraData: ColExDataType) => {
      return (
        <button
          type='button'
          className='btn btn-danger d-inline-block'
          onClick={() => {
            const { onDeleteBill } = extraData
            onDeleteBill(record)
          }}
        >
          删除
        </button>
      )
    }
  }
]

interface ColExDataType {
  categoriesIndex?: CategoriesIndex
  onDeleteBill(r: Bill): void
}

export default function () {
  const { state, actions, io } = useContext(CashbookContext)
  const colExData: ColExDataType = {
    categoriesIndex: state?.categoriesIndex,
    onDeleteBill: record => {
      actions?.remove(record)
    }
  }
  return (
    <div>
      <div>
        <ImportButton
          className='btn btn-primary'
          onImport={async (file) => {
            const result = (await io?.import('bill', file)) as BillTable
            if (result) actions?.import('bill', result)
          }}
        >
          import bill
        </ImportButton>
        <ImportButton
          className='btn btn-primary'
          onImport={async (file) => {
            const result = (await io?.import('categories', file)) as CategoriesTable
            if (result) actions?.import('categories', result)
          }}
        >
          import categories
        </ImportButton>
        <Table<Bill, ColExDataType>
          columns={billColumns}
          dataSource={state?.result}
          columnsExtraData={colExData}
        />
      </div>
    </div>
  )
}
