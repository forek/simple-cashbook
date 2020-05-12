import React, { useState, useEffect, useRef, PropsWithChildren, ReactElement, CSSProperties } from 'react'

interface DropdownProps {
  menu: {
    text: string
    key: string
  }[]
  onClick?(): void
  className?: string
  style?: CSSProperties
}

export default function Dropdown (props: PropsWithChildren<DropdownProps>) {
  const [visible, setVisible] = useState(false)
  const dropdownEl = useRef(null)
  const listenerFn = useRef(null as unknown as (e: MouseEvent) => void | null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      let el = e.target as Node | null

      do {
        if (el === dropdownEl.current) return
        el = el.parentNode
      } while (el)

      setVisible(false)
    }

    document.body.addEventListener('click', fn)
    listenerFn.current = fn
    return () => {
      document.body.removeEventListener('click', listenerFn.current)
    }
  }, [])

  const className = 'dropdown' + (props.className ? ` ${props.className}` : '')

  return (
    <div className={className} ref={dropdownEl} style={props.style}>
      {(() => {
        try {
          React.Children.only(props.children)
          return React.cloneElement(
            props.children as ReactElement,
            {
              onClick: () => setVisible(!visible)
            }
          )
        } catch (error) {
          return false
        }
      })()}
      <div className='dropdown-menu' style={{ display: visible ? 'block' : 'none' }}>
        {props.menu.map(item => (
          <div
            className='dropdown-item'
            key={item.key}
            onClick={() => {
              setVisible(!visible)
              if (props.onClick) props.onClick()
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  )
}
