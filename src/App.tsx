import React from 'react'
import useCashbook, { CashbookContext } from './hooks/useCashbook'
import Cashbook from './components/Cashbook'

function App () {
  const context = useCashbook()

  return (
    <div className='App'>
      <CashbookContext.Provider value={context}>
        <Cashbook />
      </CashbookContext.Provider>
    </div>
  )
}

export default App
