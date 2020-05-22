/* eslint-disable no-unused-expressions */
import React, { PropsWithChildren, useRef, ReactElement } from 'react'

interface Props {
  className?: string,
  onImport?(data: Blob): void
}

export default function ImportButton (props: PropsWithChildren<Props>) {
  const el = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        accept='text/csv'
        type='file'
        className='d-none'
        ref={el}
        onChange={(event) => {
          if (event.target.files?.length) {
            const file = event.target.files[0]
            if (props.onImport) props.onImport(file)
            event.target.value = ''
          }
        }}
      />
      {React.cloneElement(
        props.children as ReactElement,
        {
          onClick: () => {
            el.current?.click()
          }
        }
      )}
    </>
  )
}
