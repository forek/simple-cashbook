import React, { useContext } from 'react'
import { CashbookContext, Bill, BillTable, CategoriesTable } from '../hooks/useCashbook'
import ImportButton from './ImportButton'
import Table from './Table'

const billColumns = [
  {
    title: '时间',
    dataIndex: 'time' as keyof Bill,
    key: 'time'
  },
  {
    title: '金额',
    dataIndex: 'amount' as keyof Bill,
    key: 'amount'
  }
]

export default function () {
  const { state, actions, io } = useContext(CashbookContext)

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
        <Table<Bill>
          columns={billColumns}
          dataSource={state?.result}
        />
      </div>
    </div>
  )
}
