import React, { useContext } from 'react'
import moment from 'moment'
import { CashbookContext } from '../hooks/useCashbook'
import { ToastContext } from './Toast'
import Dropdown from './Dropdown'
import useCancelListener from '../hooks/useCancelListener'
import useFormGroup from '../hooks/useFormGroup'

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
  const { toast } = useContext(ToastContext)
  const { state, actions } = useContext(CashbookContext)
  const ref = useCancelListener(() => { props.onClose() })
  const [{ time, type, category, amount }, setState, cleanState] = useFormGroup<Form>({ time: '', type: null, category: '', amount: null })

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
                  <button
                    className='btn btn-outline-secondary' type='button' onClick={() => {
                      setState('time', moment().format('YYYY-MM-DD'))
                    }}
                  >
                    使用今天
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label>类型 / 分类 / 金额：</label>
              <div className='input-group mb-3'>
                <div className='input-group-prepend'>
                  <Dropdown
                    className='d-inline-block input-group-text cursor-pointer'
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
                    className='d-inline-block input-group-text cursor-pointer'
                    menu={
                      state?.categories.map(item => ({ text: item.name, value: item.id })) || []
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
                if (typeof type !== 'number') return toast('请选择账单类型')
                if (!category) return toast('请选择账单分类')
                if (typeof amount !== 'number') return toast('请输入金额')
                if (!time) return toast('请输入账单时间')
                const mode = ({ 16: 'YYYY-MM-DD HH:mm', 10: 'YYYY-MM-DD' } as { [key: number]: string})[time.length]
                if (!mode) return toast('请正确输入账单时间')
                const timeMoment = moment(time, mode)
                if (!timeMoment.isValid()) return toast('请正确输入账单时间')

                actions?.add('bill', {
                  type,
                  amount,
                  category,
                  time: String(timeMoment.valueOf())
                })

                cleanState()
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
