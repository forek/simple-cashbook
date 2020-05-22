import React, { useState, PropsWithChildren, ReactElement, CSSProperties } from 'react'
import useCancelListener from '../hooks/useCancelListener'
interface DropdownProps {
  menu: {
    text: string
    value: string
    render?(cb: () => void): JSX.Element
  }[]
  onClick?(v: DropdownProps['menu'][0]): void
  className?: string
  style?: CSSProperties
}

export default function Dropdown (props: PropsWithChildren<DropdownProps>) {
  const [visible, setVisible] = useState(false)
  const dropdownEl = useCancelListener(() => setVisible(false))
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
      <div className='dropdown-menu overflow-auto' style={{ display: visible ? 'block' : 'none', maxHeight: 200 }}>
        {props.menu.map(item => {
          const callbackFn = () => {
            setVisible(!visible)
            if (props.onClick) props.onClick(item)
          }

          if (item.render) {
            return <span key={item.value}>{item.render(callbackFn)}</span>
          } else {
            return (
              <div
                className='dropdown-item'
                key={item.value}
                onClick={callbackFn}
              >
                {item.text}
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
