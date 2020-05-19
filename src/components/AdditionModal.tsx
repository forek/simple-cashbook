import React, { useContext } from 'react'
import { CashbookContext } from '../hooks/useCashbook'
import Dropdown from './Dropdown'
import useCancelListener from '../hooks/useCancelListener'
import useFormGroup from '../hooks/useFormGroup'
import moment from 'moment'

interface Props {
  visible: boolean
  onClose(): void
}

interface Form {
  time: string,
  type: 0 | 1 | null,
  category: string,
  amount: number | null
}

export default function AdditionModal (props: Props) {
  const { state, actions } = useContext(CashbookContext)
  const ref = useCancelListener(() => { props.onClose() })
  const [{ time, type, category, amount }, setState] = useFormGroup<Form>({ time: '', type: null, category: '', amount: null })

  return (
    <div
      className='modal'
      style={{
        display: props.visible ? 'block' : 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }}
    >
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document' ref={ref}>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>添加账单</h5>
            <button
              type='button'
              className='close'
              onClick={() => { props.onClose() }}
            >
              <span >&times;</span>
            </button>
          </div>
          <div className='modal-body'>
            <div>
              <label>时间：</label>
              <div className='input-group mb-3'>
                <input
                  value={time}
                  onChange={(e) => setState('time', e.target.value)}
                  type='text'
                  className='form-control'
                  placeholder={`请输入时间（例如：${moment().format('YYYY-MM-DD 00:00')} 或 ${moment().format('YYYY-MM-DD')}）`}
                />
                <div className='input-group-append'>
                  <button className='btn btn-outline-secondary' type='button'>使用今天</button>
                </div>
              </div>
            </div>
            <div>
              <label>类型 / 分类 / 金额：</label>
              <div className='input-group mb-3'>
                <div className='input-group-prepend'>
                  <Dropdown
                    className='d-inline-block input-group-text'
                    menu={[
                      { text: '支出', value: '0' },
                      { text: '收入', value: '1' }
                    ]}
                    onClick={(record) => {
                      setState('type', parseInt(record.value))
                    }}
                  >
                    <span className='dropdown-toggle'>
                      类型：{
                        typeof type === 'number'
                          ? ['支出', '收入'][type]
                          : '请选择'
                      }
                    </span>
                  </Dropdown>
                  <Dropdown
                    className='d-inline-block input-group-text'
                    menu={
                      state?.filterSet.category
                        .map(item => ({
                          text: state.categoriesIndex[item].name,
                          value: item
                        })) || []
                    }
                    onClick={(record) => {
                      setState('category', record.value)
                    }}
                  >
                    <span className='dropdown-toggle'>
                      分类：{
                        (category && state?.categoriesIndex)
                          ? state.categoriesIndex[category].name
                          : '请选择'
                      }
                    </span>
                  </Dropdown>
                </div>
                <input
                  value={amount || ''}
                  onChange={e => setState('amount', parseFloat(e.target.value))}
                  type='number'
                  className='form-control'
                  placeholder='请输入金额'
                />
              </div>
            </div>
          </div>
          <div className='modal-footer'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => { props.onClose() }}
            >
              取消
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={() => {
                if (typeof type !== 'number' || typeof amount !== 'number' || !category || !time) return
                // todo
                actions?.add('bill', {
                  type,
                  amount,
                  category,
                  time: moment(time, time.length === 16 ? 'YYYY-MM-DD HH:mm' : 'YYY-MM-DD').valueOf().toString()
                })

                props.onClose()
              }}
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
