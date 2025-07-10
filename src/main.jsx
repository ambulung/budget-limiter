// src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext' // <-- IMPORT

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* WRAP YOUR APP WITH THE PROVIDER */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)