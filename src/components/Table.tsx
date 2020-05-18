import React from 'react'

interface Props<T> {
  dataSource?: T[]
  columns?: Array<{
    dataIndex?: keyof T
    key: string
    title: string
    render?(value: T[keyof T] | null): JSX.Element
  }>
}

export default function Table<T> (props: Props<T>) {
  const { columns, dataSource } = props
  return (
    <table className='table'>
      <thead>
        <tr>
          {columns?.map(item => <th key={item.key}>{item.title}</th>)}
        </tr>
      </thead>

      <tbody>
        {dataSource?.map((item, key) => (
          <tr key={key}>
            {
              columns?.map(col => {
                if (!col.dataIndex && !col.render) return false
                if (!col.dataIndex && col.render) return col.render(null)
                const currentValue = item[col.dataIndex as keyof T]
                return (
                  <td key={col.key}>{col.render ? col.render(currentValue) : currentValue}</td>
                )
              })
            }
          </tr>
        ))}
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
