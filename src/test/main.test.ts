/* eslint-disable no-undef */
import { io, Bill, Category, reducer, initalState, createActions, CategoriesIndex } from '../hooks/useCashbook'

const testBill = `type,time,category,amount
0,1561910400000,8s0p77c323,5400
0,1561910400000,0fnhbcle6hg,1500
0,1563897600000,3tqndrjqgrg,3900
0,1564502400000,bsn20th0k2o,1900
1,1577345303191,1vjj47vpd28,-10000`

describe('io.import测试', () => {
  test('导入账单表', async () => {
    const bill = (await io.import('bill', new Blob(['type,time,category,amount\n0,1561910400000,8s0p77c323,5400']))) as Bill[]
    expect(bill.length).toBe(1)
    expect(bill).toEqual([{ type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400, id: bill[0].id }])
  })

  test('导入类型表', async () => {
    const category = (await io.import('categories', new Blob(['id,type,name\n1bcddudhmh,0,车贷']))) as Category[]
    expect(category.length).toBe(1)
    expect(category).toEqual([{ type: 0, id: '1bcddudhmh', name: '车贷' }])
  })
})

describe('actions/reducer测试', () => {
  let state = { ...initalState }

  const actions = createActions(action => {
    state = reducer(state, action)
  })

  it('actions.init', () => {
    actions.init(initalState)
    expect(state).toEqual(initalState)
  })

  it('actions.import("categories", ...)', async () => {
    const categories = (await io.import('categories', new Blob(['id,type,name\n1bcddudhmh,0,车贷']))) as Category[]

    actions.import('categories', categories)

    expect(state.categories.length).toBe(1)
    expect(state.categories).toEqual([{ type: 0, id: '1bcddudhmh', name: '车贷' }])
    expect(state.categoriesIndex as CategoriesIndex).toEqual({ '1bcddudhmh': { type: 0, name: '车贷' } } as CategoriesIndex)
  })

  it('actions.import("bill", ...)', async () => {
    const billTable = (await io.import('bill', new Blob([testBill]))) as Bill[]

    actions.import('bill', billTable)

    expect(state.bill.length).toBe(5)
    expect(state.bill).toEqual([
      { type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400, id: billTable[0].id },
      { type: 0, time: '1561910400000', category: '0fnhbcle6hg', amount: 1500, id: billTable[1].id },
      { type: 0, time: '1563897600000', category: '3tqndrjqgrg', amount: 3900, id: billTable[2].id },
      { type: 0, time: '1564502400000', category: 'bsn20th0k2o', amount: 1900, id: billTable[3].id },
      { type: 1, time: '1577345303191', category: '1vjj47vpd28', amount: -10000, id: billTable[4].id }
    ])

    expect(state.filterSet).toEqual(
      {
        id: [],
        type: [],
        time: [
          { value: '2019-07', count: 4 },
          { value: '2019-12', count: 1 }
        ],
        amount: [],
        category:
         [{ value: '8s0p77c323', count: 1 },
           { value: '0fnhbcle6hg', count: 1 },
           { value: '3tqndrjqgrg', count: 1 },
           { value: 'bsn20th0k2o', count: 1 },
           { value: '1vjj47vpd28', count: 1 }]
      }
    )
  })

  it('actions.add', () => {
    const bill = { id: 'foo', time: '1561910400000', type: 1, category: '8s0p77c323', amount: 5400 } as Bill

    actions.add('bill', bill)

    expect(state.bill.length).toBe(6)
    expect(state.bill[5]).toEqual(bill)
  })

  it('actions.remove', () => {
    const bill = { id: 'foo', time: '1561910400000', type: 1, category: '8s0p77c323', amount: 5400 } as Bill
    actions.remove(bill)

    expect(state.bill.length).toBe(5)
    expect(state.bill.find(item => item.id === 'foo')).toBe(undefined)
  })

  it('actions.setFilter', () => {
    actions.setFilter<'category'>('category', '8s0p77c323')

    expect(state.display.length).toBe(1)
    expect(state.display[0]).toEqual({ type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400, id: state.bill[0].id })

    actions.setFilter<'time'>('time', '2019-12')

    expect(state.display.length).toBe(0)
  })

  it('actions.removeFitler', () => {
    actions.removeFilter('time')
    actions.removeFilter('category')

    expect(state.display.length).toBe(5)
  })

  it('actions.setPagination', () => {
    state.pagination.perPage = 1

    actions.setPagination(0)
    expect(state.display.length).toBe(1)
    expect(state.display[0]).toEqual({ type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400, id: state.bill[0].id })

    actions.setPagination(1)
    expect(state.display.length).toBe(1)
    expect(state.display[0]).toEqual({ type: 0, time: '1561910400000', category: '0fnhbcle6hg', amount: 1500, id: state.bill[1].id })

    actions.setPagination(10)
    expect(state.display.length).toBe(1)
    expect(state.pagination.current).toBe(0)
    expect(state.display[0]).toEqual({ type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400, id: state.bill[0].id })
  })

  it('statistics.revenue', () => {
    actions.setFilter<'time'>('time', '2019-12')

    expect(state.statistics.revenue).toEqual(['0', '-10000'])

    actions.setFilter<'time'>('time', '2019-07')

    expect(state.statistics.revenue).toEqual([String(5400 + 1500 + 3900 + 1900), '0'])
  })

  it('statistics.expenditure', () => {
    expect(state.statistics.expenditure).toEqual([
      { category: '0fnhbcle6hg', amount: '1500' },
      { category: 'bsn20th0k2o', amount: '1900' },
      { category: '3tqndrjqgrg', amount: '3900' },
      { category: '8s0p77c323', amount: '5400' }
    ])

    actions.add('bill', { type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400 })

    expect(state.statistics.expenditure).toEqual([
      { category: '0fnhbcle6hg', amount: '1500' },
      { category: 'bsn20th0k2o', amount: '1900' },
      { category: '3tqndrjqgrg', amount: '3900' },
      { category: '8s0p77c323', amount: '10800' }
    ])
  })
})
