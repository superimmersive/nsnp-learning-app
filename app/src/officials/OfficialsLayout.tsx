import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { formatClockLabel } from './time'
import { OfficialsProvider, useOfficials } from './store'
import type { ViewerRole } from './types'

const links = [
  { to: '/officials', label: 'District home', end: true },
  { to: '/officials/issues', label: 'Issues', end: false },
  { to: '/officials/codes', label: 'Codes', end: false },
  { to: '/officials/export', label: 'Export', end: false },
]

export function OfficialsLayout() {
  return (
    <OfficialsProvider>
      <OfficialsFrame />
    </OfficialsProvider>
  )
}

function OfficialsFrame() {
  const { snapshot, viewingAs, setViewingAs } = useOfficials()
  const location = useLocation()
  const extra =
    viewingAs === 'super_admin'
      ? [
          { to: '/officials/audit', label: 'Audit log', end: false },
          { to: '/officials/releases', label: 'Content releases', end: false },
        ]
      : []

  useEffect(() => {
    document.title = 'NSNP trial dashboard'
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 bg-navy pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">NSNP trial dashboard</p>
            <p className="truncate text-xs text-white/70">{snapshot.district.name}</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-white/70">Viewing as</span>
            <select
              className="h-10 rounded-lg border border-white/20 bg-white px-2 text-navy"
              value={viewingAs}
              onChange={(event) => setViewingAs(event.target.value as ViewerRole)}
            >
              <option value="district_official">District official</option>
              <option value="super_admin">Super-admin</option>
            </select>
          </label>
        </div>
        <nav aria-label="Dashboard" className="border-t border-white/10">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-2">
            {[...links, ...extra].map((link) => (
              <li key={link.to} className="shrink-0">
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold ${
                      isActive ? 'bg-white text-navy' : 'text-white/80 hover:bg-white/10'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <p className="bg-gold-soft px-4 py-2 text-center text-sm font-semibold text-navy">
        Example data - trial prototype
        <span className="mt-0.5 block font-medium text-ink">
          Not live school data. Example clock {formatClockLabel(snapshot.asOf)}. Both district officials see every school.
        </span>
      </p>
      <main id="content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 pb-16 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
