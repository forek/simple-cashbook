import React from 'react'
import Drapdown from './components/Dropdown'
import useCashbook from './hooks/useCashbook'

function App () {
  const { state, actions, io } = useCashbook()

  return (
    <div className='App'>
      <button type='button' className='btn btn-primary'>Primary</button>

      <Drapdown
        className='d-inline-block'
        menu={[
          {
            key: 'hello',
            text: 'hello'
          }
        ]}
      >
        <button className='btn btn-secondary dropdown-toggle' type='button'>
          fxxking
        </button>
      </Drapdown>
    </div>
  )
}

export default App
