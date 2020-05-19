import { useEffect, useRef } from 'react'

interface Callback {
  (): void
}

export default function useCancelListener (cb: Callback) {
  const elRef = useRef(null)
  const listenerFn = useRef(null as unknown as (e: MouseEvent) => void | null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      let el = e.target as Node | null

      do {
        if (el === elRef.current) return
        el = el.parentNode
      } while (el)

      cb()
    }

    document.body.addEventListener('click', fn)
    listenerFn.current = fn
    return () => {
      document.body.removeEventListener('click', listenerFn.current)
    }
  }, [])

  return elRef
}
