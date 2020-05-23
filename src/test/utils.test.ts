/* eslint-disable no-undef */
import csvBuilder from '../utils/csvBuilder'
import { Bill } from '../hooks/useCashbook'

describe('utils测试', () => {
  it('csvBuilder', () => {
    const result = csvBuilder<Bill>(['type', 'time', 'category', 'amount'], [{ type: 0, time: '1561910400000', category: '8s0p77c323', amount: 5400, id: 'foo' }])
    expect(result).toEqual('type,time,category,amount\n0,1561910400000,8s0p77c323,5400')
  })
})
