import React from 'react'
import ReactDOM from 'react-dom/client'
// Toggle between the two demos by changing the import
// import App from './App'  // Traditional scroll-based approach
import App from './AppObserver'  // Intersection Observer approach
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)