import React, { PropsWithChildren, useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
interface Props {}

interface ToastData {
  createAt: number
  message: string
  id: string
}

interface ToastContextType {
  toast(msg: string): void
}

export const ToastContext = React.createContext<ToastContextType>({ toast: () => {} })

export default function Toast (props: PropsWithChildren<Props>) {
  const [list, setList] = useState<ToastData[]>([])
  const timer = useRef(0)

  useEffect(() => {
    timer.current = setInterval(() => {
      setList(list.filter(item => {
        return Date.now() - item.createAt < 2000
      }))
    }, 100) as unknown as number
    return () => {
      clearInterval(timer.current)
    }
  }, [list])

  return (
    <>
      <ToastContext.Provider
        value={{
          toast: (msg: string) => {
            setList(list.concat({
              message: msg,
              id: uuidv4(),
              createAt: Date.now()
            }))
          }
        }}
      >
        {props.children}
      </ToastContext.Provider>
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1051 }}>
        {
          list.map((item) => (
            <div className='toast show' key={item.id}>
              <div className='toast-header'>
                <strong className='mr-auto'>Tips</strong>
              </div>
              <div className='toast-body' style={{ minWidth: 200 }}>
                {item.message}
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}
