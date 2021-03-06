import React, { useContext, useState } from 'react'
import ReactPaginate from 'react-paginate'
import moment from 'moment'
import { CashbookContext, Bill, BillTable, CategoriesTable, CategoriesIndex, CashbookState } from '../hooks/useCashbook'
import { ToastContext } from './Toast'
import ImportButton from './ImportButton'
import AdditionModal from './AdditionModal'
import Dropdown from './Dropdown'
import Table from './Table'
import saveFile from '../utils/saveFile'

const billColumns = [
  {
    title: '时间',
    dataIndex: 'time' as keyof Bill,
    key: 'time',
    render: (value: Bill['time']) => {
      return moment(parseInt(value)).format('YYYY-MM-DD')
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
    render: (value: Bill['category'], _: Bill, extraData: MainTableExDataType) => {
      const { categoriesIndex } = extraData
      if (!categoriesIndex) return value
      return categoriesIndex[value]?.name || '未知分类'
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
    render: (v: null, record: Bill, extraData: MainTableExDataType) => {
      return (
        <button
          type='button'
          className='btn btn-danger d-inline-block btn-sm'
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

type Expenditure = CashbookState['statistics']['expenditure'][0]

const statisticsColumns = [
  {
    title: '分类',
    key: 'category',
    dataIndex: 'category' as keyof Expenditure,
    render: (value: Expenditure['category'], _: Expenditure, extraData: StatisticsTableExDataType) => {
      const { categoriesIndex } = extraData
      if (!categoriesIndex) return value
      return categoriesIndex[value]?.name || '未知分类'
    }
  },
  {
    title: '金额',
    key: 'amount',
    dataIndex: 'amount' as keyof Expenditure
  }
]

interface MainTableExDataType {
  categoriesIndex?: CategoriesIndex
  onDeleteBill(r: Bill): void
}

interface StatisticsTableExDataType {
  categoriesIndex?: CategoriesIndex
}

const emptyFilter = [{ text: '无', value: '' }]

export default function Cashbook () {
  const { state, actions, io } = useContext(CashbookContext)
  const { toast } = useContext(ToastContext)
  const [visible, setVisible] = useState(false)

  const mainExData: MainTableExDataType = {
    categoriesIndex: state?.categoriesIndex,
    onDeleteBill: record => {
      actions?.remove(record)
    }
  }

  const statExData: StatisticsTableExDataType = {
    categoriesIndex: state?.categoriesIndex
  }

  const showStatistics = state?.filters.time && state?.statistics.show

  return (
    <div className='px-3'>
      <AdditionModal
        visible={visible}
        onClose={() => { setVisible(false) }}
      />
      <div className='mt-3 mb-3 p-4 bg-white'>
        <Dropdown
          className='d-inline-block'
          menu={
            emptyFilter.concat(state?.filterSet.time.map(item => ({ text: item.value, value: item.value })) || [])
          }
          onClick={(v) => {
            if (v.value) {
              actions?.setFilter('time', v.value)
            } else {
              actions?.removeFilter('time')
            }
          }}
        >
          <button className='mr-2 btn btn-primary dropdown-toggle'>月份筛选: {state?.filters.time || '无'}</button>
        </Dropdown>
        <Dropdown
          className='d-inline-block'
          menu={
            emptyFilter
              .concat(state?.categories.map(item => ({ text: item.name, value: item.id })) || [])
          }
          onClick={(v) => {
            if (v.value) {
              actions?.setFilter('category', v.value)
            } else {
              actions?.removeFilter('category')
            }
          }}
        >
          <button className='btn btn-primary dropdown-toggle'>分类筛选: {
            state?.filters.category
              ? state.categoriesIndex[state?.filters.category].name
              : '无'
          }
          </button>
        </Dropdown>
        {
          !!(state?.categories.length && state.bill.length) &&
          <Dropdown
            className='d-inline-block'
            menu={
              [
                { text: '随机添加一千条账单', value: '1000' },
                { text: '随机添加一万条账单', value: '10000' },
                { text: '随机添加十万条账单', value: '100000' }
              ]
            }
            onClick={(v) => {
                actions?.createRandomBillTable(parseInt(v.value))
            }}
          >
            <button className='ml-2 btn btn-secondary dropdown-toggle'>性能测试</button>
          </Dropdown>
        }

        <div className='float-right'>
          <button
            type='button'
            className='btn btn-success'
            onClick={() => {
              if (state?.bill && state.categories) {
                try {
                  io?.save(state?.bill, state?.categories)
                  toast('保存成功')
                } catch (error) {
                  toast('保存失败，请使用“保存为文件”功能保存数据')
                  console.error(error)
                }
              }
            }}
          >
            保存
          </button>
          <button
            type='button'
            className='btn btn-success ml-2'
            onClick={() => {
              if (state?.bill) {
                saveFile(`账单表（${moment().format('YYYY-MM-DD HH:mm')}）.csv`, state.bill)
              }
            }}
          >
            保存为文件
          </button>
          <button
            type='button'
            className='btn ml-2 btn-primary'
            onClick={() => {
              if (!state?.categories.length) return toast('请先导入类型表')
              setVisible(!visible)
            }}
          >
            添加账单
          </button>
          <button
            type='button'
            className='btn ml-2 btn-danger'
            onClick={() => {
              io?.clearAndSave()
            }}
          >
            清空数据
          </button>
          <Dropdown
            className='d-inline-block'
            menu={
              [
                {
                  text: '导入账单表',
                  value: '0',
                  render: (cb) => (
                    <ImportButton
                      className='btn btn-info ml-2'
                      onImport={async (file) => {
                        try {
                          const result = (await io?.import('bill', file)) as BillTable
                          if (result) actions?.import('bill', result)
                          cb()
                        } catch (error) {
                          toast(`导入失败：${error.message}`)
                        }
                      }}
                    >
                      <div className='dropdown-item' >导入账单表</div>
                    </ImportButton>
                  )
                },
                {
                  text: '导入类型表',
                  value: '1',
                  render: (cb) => (
                    <ImportButton
                      className='btn btn-info ml-2'
                      onImport={async (file) => {
                        try {
                          const result = (await io?.import('categories', file)) as CategoriesTable
                          if (result) actions?.import('categories', result)
                          cb()
                        } catch (error) {
                          toast(`导入失败：${error.message}`)
                        }
                      }}
                    >
                      <div className='dropdown-item' >导入类型表</div>
                    </ImportButton>
                  )
                }
              ]
            }
          >
            <button className='btn btn-info ml-2 dropdown-toggle'>导入数据</button>
          </Dropdown>
        </div>
      </div>
      <div className='bg-white px-2'>
        <Table<Bill, MainTableExDataType>
          columns={billColumns}
          dataSource={state?.display}
          columnsExtraData={mainExData}
        />
      </div>
      <div className='bg-white p-4 text-right'>
        <div id='react-paginate'>
          {
            showStatistics && state &&
              <div className='d-inline-block float-left mt-2'>
                {state.filters.time} 月度收支统计 - 收入：
                <span className='text-primary'>￥{state.statistics.revenue[1]}</span> ；支出：
                <span className='text-primary'> ￥{state.statistics.revenue[0]}</span>
              </div>
          }
          {
            state &&
              <ReactPaginate
                pageCount={Math.ceil(state.pagination.total / state.pagination.perPage)}
                breakLabel='...'
                forcePage={state.pagination.current}
                pageRangeDisplayed={5}
                marginPagesDisplayed={2}
                containerClassName='pagination m-0'
                breakClassName='page-item'
                breakLinkClassName='page-link'
                pageClassName='page-item'
                pageLinkClassName='page-link'
                previousClassName='page-item'
                nextClassName='page-item'
                previousLinkClassName='page-link'
                nextLinkClassName='page-link'
                activeClassName='page-item active'
                previousLabel='上一页'
                nextLabel='下一页'
                onPageChange={({ selected }) => {
                  actions?.setPagination(selected)
                }}
              />
          }
        </div>
      </div>
      {
        showStatistics && state &&
          <div className='bg-white mt-3 px-2'>
            <h2 className='fs-16 m-0 px-2 pt-3'>{state.filters.time} 月度分类支出统计：</h2>
            <Table<Expenditure, StatisticsTableExDataType>
              columns={statisticsColumns}
              dataSource={state.statistics.expenditure}
              columnsExtraData={statExData}
            />
          </div>
      }
    </div>
  )
}
