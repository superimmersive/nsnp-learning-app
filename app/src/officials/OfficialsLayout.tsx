import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { roleLabel } from './metrics'
import { isDashboardRole } from './session'
import { OfficialSignIn } from './SignIn'
import { formatClockLabel } from './time'
import { OfficialsProvider, useOfficials } from './store'
import type { ViewerRole } from './types'

function isDashboardLinkActive(pathname: string, to: string): boolean {
  if (to === '/officials') {
    return pathname === '/officials' || pathname.startsWith('/officials/schools')
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

const links = [
  { to: '/officials', label: 'District home' },
  { to: '/officials/issues', label: 'Issues' },
  { to: '/officials/codes', label: 'Codes' },
  { to: '/officials/export', label: 'Export' },
]

export function OfficialsLayout() {
  return (
    <OfficialsProvider>
      <OfficialsFrame />
    </OfficialsProvider>
  )
}

function OfficialsFrame() {
  const {
    snapshot,
    viewingAs,
    setViewingAs,
    remote,
    live,
    session,
    signIn,
    signOut,
    supportReason,
    setSupportReason,
    remoteError,
  } = useOfficials()
  const location = useLocation()
  const signedOfficial = remote && session != null && isDashboardRole(session.role)
  const showNav = !remote || signedOfficial
  const waitingForReason = signedOfficial && viewingAs === 'super_admin' && !supportReason.trim()
  const extra =
    showNav && viewingAs === 'super_admin'
      ? [
          { to: '/officials/audit', label: 'Audit log' },
          { to: '/officials/releases', label: 'Content releases' },
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
        <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              <span className="sm:hidden">NSNP trial</span>
              <span className="hidden sm:inline">NSNP trial dashboard</span>
            </p>
            <p className="hidden truncate text-xs text-white/70 sm:block">{snapshot.district.name}</p>
          </div>
          {remote && session ? (
            <div className="flex shrink-0 items-center gap-2 text-sm">
              <span className="hidden sm:inline">{roleLabel(session.role)}</span>
              <button type="button" className="h-8 rounded-md bg-white px-2 font-semibold text-navy" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : !remote ? (
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <span className="hidden text-white/70 sm:inline">Viewing as</span>
              <select
                className="h-8 w-[9.75rem] rounded-md border border-white/20 bg-white px-2 text-sm text-navy sm:h-10 sm:w-auto"
                value={viewingAs}
                onChange={(event) => setViewingAs(event.target.value as ViewerRole)}
                aria-label="Viewing as"
              >
                <option value="district_official">District official</option>
                <option value="super_admin">Super-admin</option>
              </select>
            </label>
          ) : null}
        </div>
        {showNav && <nav aria-label="Dashboard" className="border-t border-white/10">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1 sm:py-2">
            {[...links, ...extra].map((link) => {
              const active = isDashboardLinkActive(location.pathname, link.to)
              return (
                <li key={link.to} className="shrink-0">
                  <Link
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex h-8 items-center whitespace-nowrap rounded-lg px-2.5 text-sm font-semibold sm:h-10 sm:px-3 ${
                      active ? 'bg-white text-navy' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>}
      </header>
      <p className="bg-gold-soft px-3 py-1 text-center text-xs font-semibold leading-4 text-navy sm:px-4 sm:py-2 sm:text-sm sm:leading-5">
        Example data - trial prototype
        <span className="mt-0.5 hidden font-medium text-ink sm:block">
          Not live school data. Example clock {formatClockLabel(snapshot.asOf)}. Both district officials see every school.
        </span>
      </p>
      <main id="content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 pb-16 outline-none">
        {remote && !session && <OfficialSignIn onSignedIn={signIn} />}
        {remote && session && !isDashboardRole(session.role) && (
          <p className="text-base" role="alert">
            This dashboard is for a district official or the super-admin.
          </p>
        )}
        {waitingForReason && (
          <form
            className="mb-4 max-w-lg rounded-xl border border-line bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              setSupportReason(String(data.get('reason') ?? '').trim())
            }}
          >
            <h1 className="text-xl font-semibold text-navy">Reason for opening the trial</h1>
            <p className="mt-2 text-sm">Super-admin access is written to the audit log.</p>
            <input name="reason" required className="mt-3 h-12 w-full rounded-lg border border-line px-3" />
            <button type="submit" className="mt-3 h-12 rounded-lg bg-navy px-4 font-semibold text-white">
              Continue
            </button>
          </form>
        )}
        {remoteError && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{remoteError}</p>}
        {signedOfficial && !waitingForReason && !live && !remoteError && <p className="text-base">Loading the trial list.</p>}
        {(!remote || (signedOfficial && !waitingForReason && live)) && <Outlet />}
      </main>
    </div>
  )
}
