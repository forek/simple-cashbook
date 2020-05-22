/* eslint-disable no-undef */
import React, { useEffect } from 'react'
import { render } from '@testing-library/react'

import useCashbook, { CashbookState, initalState } from './useCashbook'

let tmpState = {}

function TestApp () {
  const { state } = useCashbook()

  useEffect(() => {
    tmpState = state
  }, [state])

  return (
    <div id='allState'>{JSON.stringify(state)}</div>
  )
}

describe('hook测试: useCashbook', () => {
  render(<TestApp />)
  const stateElement = document.querySelector('#allState')

  test('基础渲染', () => {
    expect(stateElement).toBeInTheDocument()
  })

  test('默认状态', () => {
    expect(JSON.stringify(tmpState as CashbookState)).toEqual(JSON.stringify(initalState))
  })
})
