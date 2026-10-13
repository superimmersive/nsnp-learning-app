import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // A failed worker must not stop the lessons from opening.
    })
  })
}
