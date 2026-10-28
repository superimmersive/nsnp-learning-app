import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { PrototypeProvider, usePrototype } from './store'

export function JoinLayout() {
  return (
    <PrototypeProvider>
      <JoinFrame />
    </PrototypeProvider>
  )
}

export function PrototypeBanner() {
  return (
    <p className="bg-gold-soft px-4 py-2 text-center text-sm font-semibold text-navy">
      Example data - trial prototype
    </p>
  )
}

function JoinFrame() {
  const { snapshot, phone } = usePrototype()
  const location = useLocation()
  const school = snapshot.schools.find((item) => item.id === phone.usedAtSchoolId)

  useEffect(() => {
    document.title = 'Join this school'
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
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-semibold">NSNP trial</p>
          <Link to="/prototype" className="inline-flex h-12 items-center text-sm font-semibold text-white">
            Prototype menu
          </Link>
        </div>
      </header>
      <PrototypeBanner />
      <main id="content" tabIndex={-1} className="mx-auto w-full max-w-md px-4 py-5 pb-16 outline-none">
        {school && (
          <p className="mb-4 rounded-lg bg-white px-4 py-3 text-sm text-navy">
            This phone is used at <span className="font-semibold">{school.name}</span>.
          </p>
        )}
        <Outlet />
      </main>
    </div>
  )
}
