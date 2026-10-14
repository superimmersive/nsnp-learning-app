import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { isNativeApp, prepareNativeShell } from './lib/native.ts'
import { routerBasename } from './lib/site-base.ts'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if (import.meta.env.VITE_NATIVE === '1') {
  void prepareNativeShell()
}

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_NATIVE !== '1' && !isNativeApp()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // A failed worker must not stop the lessons from opening.
    })
  })
}
