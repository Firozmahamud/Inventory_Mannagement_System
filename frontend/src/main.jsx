import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const saved = localStorage.getItem('darkMode')
const isDark = saved !== null 
  ? saved === 'true' 
  : window.matchMedia('(prefers-color-scheme: dark)').matches
if (isDark) {
  document.documentElement.classList.add('dark')
  document.body.classList.add('dark')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
