import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { maskPhone } from '@/officials/metrics'
import { PrototypeBanner } from '../JoinLayout'
import { clearPrototypeStorage, prototypeStorage } from '../storage'
import { PrototypeProvider, usePrototype } from '../store'

const links = [
  { to: '/join/coordinator', title: 'Coordinator first claim', detail: 'Use the code the district official read to you.' },
  { to: '/join/staff', title: 'Staff join', detail: 'Use the staff code from your coordinator.' },
  { to: '/join/phone', title: 'Shared kitchen phone', detail: 'Switch person with a PIN.' },
  { to: '/officials', title: 'Officials dashboard', detail: 'District home, codes, and issues.' },
]

export function PrototypePage() {
  return (
    <PrototypeProvider>
      <PrototypeHome />
    </PrototypeProvider>
  )
}

function PrototypeHome() {
  const { snapshot } = usePrototype()
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-navy px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <p className="text-sm font-semibold">NSNP trial</p>
        <h1 className="mt-1 text-2xl font-semibold">Prototype menu</h1>
      </header>
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-md px-4 py-5">
        <p className="text-sm leading-relaxed">
          Example schools only. The lesson home is unchanged. Codes you issue on the officials Codes page are kept in
          this browser and work on Join this school.
        </p>
        <ul className="mt-4 grid gap-3">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="block rounded-xl border border-line bg-white px-4 py-4 active:bg-paper"
              >
                <span className="block text-lg font-semibold text-navy">{link.title}</span>
                <span className="mt-1 block text-sm text-ink">{link.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-navy">Demo codes</h2>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed">
            <li>
              <span className="font-semibold">DRY4K2</span> with cellphone 082 000 0091 — first claim at Dryveld Example
              Primary. Any other number is rejected.
            </li>
            <li>
              <span className="font-semibold">OLD2K4</span> with cellphone 082 000 0099 — this coordinator code has
              expired.
            </li>
            <li>
              <span className="font-semibold">HANDL2</span> — staff code for Riverbend Example Primary. Pick food
              handler, SMT member, or principal. You stay pending until someone approves you.
            </li>
            <li>Demo SMS code on the next screen: 123456.</li>
            <li>Shared phone PINs already saved: Thandi Maseko 2580, Lindi Ndlovu 4691.</li>
            <li>New phone demo: 082 000 2000 loads Thandi Maseko’s lessons.</li>
          </ul>
          <p className="mt-3 text-sm">
            Other staff codes:{' '}
            {snapshot.staffCodes
              .map((item) => {
                const school = snapshot.schools.find((school) => school.id === item.schoolId)
                return `${item.code} (${school?.name.replace(' Example', '') ?? item.code})`
              })
              .join(', ')}
            . A code issued on the dashboard uses the cellphone recorded there.
          </p>
          <p className="mt-3 text-sm">
            Saved coordinator codes:{' '}
            {snapshot.joinCodes
              .map((item) => `${item.code} ${maskPhone(item.cellphone)}`)
              .join('; ')}
            .
          </p>
        </section>
        <section className="mt-8 grid gap-3">
          <Link to="/join/recover" className="text-base font-semibold text-blue">
            New phone? Sign in with your cellphone
          </Link>
          <Link to="/join/existing" className="text-base font-semibold text-blue">
            Phone that already has lessons
          </Link>
          <Link to="/join/people" className="text-base font-semibold text-blue">
            People at this school
          </Link>
          <Button
            type="button"
            variant="outline"
            className="h-14"
            onClick={() => {
              clearPrototypeStorage(prototypeStorage())
              window.location.assign('/prototype')
            }}
          >
            Start again with the example schools
          </Button>
        </section>
      </main>
    </div>
  )
}
