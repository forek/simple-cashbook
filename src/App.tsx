/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import Drapdown from './components/Dropdown'

function App() {
  return (
    <div className="App">
      <button type="button" className="btn btn-primary">Primary</button>

      <Drapdown
        renderTrigger={() => (
          <button className="btn btn-secondary dropdown-toggle" type="button">
            fxxking
          </button>
        )}
        menu={[
          {
            key: 'hello',
            text: 'hello'
          }
        ]}
        onClick={() => {}}
      />
    </div>
  );
}

export default App;
