import { useState } from 'react'

export default function useFormGroup<T extends {}> (initalState: {}) {
  type key = keyof T
  const [state, setState] = useState(initalState)

  return [state, (key: string, value: T[key]) => {
    setState({ ...state, [key]: value })
  }] as [T, (key: string, value: T[key]) => void]
}
