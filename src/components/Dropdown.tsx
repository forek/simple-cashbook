import React, { useState, useEffect, useRef } from 'react';

interface DropdownProps {
  menu: {
    text: string;
    key: string;
  }[];
  renderTrigger(): JSX.Element;
  onClick(): void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Dropdown(props: DropdownProps) {
  const [visible, setVisible] = useState(false);
  const dropdownEl = useRef(null);
  const listenerFn = useRef(null as unknown as (e: MouseEvent) => void | null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      let el = e.target as Node | null;

      do {
        if (el === dropdownEl.current) return;
        el = el.parentNode;
      } while (el);

      setVisible(false);
    }

    document.body.addEventListener('click', fn);
    listenerFn.current = fn;
    return () => {
      document.body.removeEventListener('click', listenerFn.current);
    }
  }, []);

  const className = 'dropdown' + (props.className ? ` ${props.className}` : '');

  return (
    <div className={className} ref={dropdownEl} style={props.style}>
      {React.cloneElement(
        props.renderTrigger(),
        {
          onClick: () => setVisible(!visible)
        }
      )}
      <div className="dropdown-menu" style={{ display: visible ? 'block' : 'none' }}>
        {props.menu.map(item => (
          <div
            className="dropdown-item"
            key={item.key}
            onClick={() => {
              setVisible(!visible)
              props.onClick()
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  )
}