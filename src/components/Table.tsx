import React from 'react'

interface Props<T, P = {}> {
  dataSource?: T[]
  columns?: Array<{
    dataIndex?: keyof T
    key: string
    title: string
    render?(value: T[keyof T] | null, record: T, extraData?: P): JSX.Element | boolean | string
  }>
  columnsExtraData?: P
}

export default function Table<T, P> (props: Props<T, P>) {
  const { columns, dataSource } = props
  return (
    <table className='table'>
      <thead>
        <tr>
          {columns?.map(item => <th key={item.key}>{item.title}</th>)}
        </tr>
      </thead>

      <tbody>
        {
        dataSource?.length
          ? dataSource.map((item, key) => (
            <tr key={key}>
              {
              columns?.map(col => {
                if (!col.dataIndex && !col.render) return false
                if (!col.dataIndex && col.render) return <td key={col.key}>{col.render(null, item, props.columnsExtraData)}</td>
                const currentValue = item[col.dataIndex as keyof T]
                return (
                  <td key={col.key}>{col.render ? col.render(currentValue, item, props.columnsExtraData) : currentValue}</td>
                )
              })
              }
            </tr>
          ))
          : <tr><td colSpan={5} className='text-center'>暂无数据显示</td></tr>
        }
      </tbody>

      {/*
            <tfoot>
        <tr>
          <td>Sum</td>
          <td>$180</td>
        </tr>
      </tfoot>
      */}

    </table>
  )
}
