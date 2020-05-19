import React from 'react'
import useCashbook, { CashbookContext } from './hooks/useCashbook'
import ToastProvider from './components/Toast'
import Cashbook from './components/Cashbook'
import './App.css'

function App () {
  const context = useCashbook()

  return (
    <div className='App'>
      <nav className='nav bg-white py-3'>
        <a className='nav-link active' href='#'>简易记账本</a>
      </nav>
      <ToastProvider>
        <CashbookContext.Provider value={context}>
          <Cashbook />
        </CashbookContext.Provider>
      </ToastProvider>
    </div>
  )
}

export default App
