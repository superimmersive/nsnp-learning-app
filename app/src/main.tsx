import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import App from './App.tsx'
import { webBasename } from './lib/platform.ts'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// Literal mode check so Vite can drop the unused branch from each build.
// Keep this string in sync with NATIVE_MODE in src/lib/platform.ts.
const native = import.meta.env.MODE === 'native'

createRoot(root).render(
  <StrictMode>
    {native ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter basename={webBasename(import.meta.env.BASE_URL)}>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)

if (native) {
  void configureNativeShell()
}

if ('serviceWorker' in navigator && import.meta.env.PROD && !native) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // A failed worker must not stop the lessons from opening.
    })
  })
}

async function configureNativeShell() {
  const { SystemBars, SystemBarsStyle, SystemBarType } = await import('@capacitor/core')
  const { SplashScreen } = await import('@capacitor/splash-screen')
  await SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar })
  await SystemBars.setStyle({ style: SystemBarsStyle.Light, bar: SystemBarType.NavigationBar })
  await SplashScreen.hide()
}
