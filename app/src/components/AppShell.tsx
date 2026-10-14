import { Award, Clock3, House, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { content } from '@/lib/content'
import { isNativeApp } from '@/lib/native'
import { passedCount } from '@/lib/progress'
import { useProgress } from '@/context/ProgressContext'

const links = [
  { to: '/', label: content.ui.nav.home, icon: House, end: true },
  { to: '/checklists', label: content.ui.nav.checklists, icon: ListChecks, end: false },
  { to: '/deadlines', label: content.ui.nav.deadlines, icon: Clock3, end: false },
  { to: '/certificate', label: content.ui.nav.certificate, icon: Award, end: false },
]

export function AppShell() {
  const { state } = useProgress()
  const location = useLocation()
  const [online, setOnline] = useState(true)
  const passed = passedCount(
    state,
    content.modules.map((module) => module.id),
  )
  const percent = Math.round((passed / content.modules.length) * 100)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        {content.ui.skipToContent}
      </a>
      <header className="no-print sticky top-0 z-20 bg-navy pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-sm font-bold tracking-wide">
              NS
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">NSNP Learning</span>
              <span className="block truncate text-xs text-white/70">{content.meta.districtShort}</span>
            </span>
          </NavLink>
          <span className="shrink-0 text-sm font-semibold text-gold-bright">{content.meta.year}</span>
        </div>
        <div className="h-1 bg-white/15" aria-hidden="true">
          <div className="h-full bg-gold-bright" style={{ width: `${percent}%` }} />
        </div>
      </header>
      {!online && (
        <p className="bg-gold-soft px-4 py-2 text-center text-sm font-medium text-navy">
          {isNativeApp() ? content.ui.offlineNative : content.ui.offline}
        </p>
      )}
      <main id="content" className="mx-auto w-full max-w-xl px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <nav
        aria-label={content.ui.nav.landmark}
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                    isActive ? 'text-blue' : 'text-muted'
                  }`
                }
              >
                <link.icon className="h-5 w-5" aria-hidden="true" />
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
