import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { roleLabel } from '@/officials/metrics'
import { fieldClass } from '@/officials/present'
import { formatWhen } from '@/officials/time'
import { apiSend } from '@/sync/client'
import { apiBase } from '@/sync/config'
import { enqueueOutbox, flushOutbox } from '@/sync/outbox'
import { nowIso, pinSwitchAllowed } from '../access'
import { prototypeStorage } from '../storage'
import { usePrototype } from '../store'

const openedAt = nowIso()

export function PhonePage() {
  const { snapshot, phone, replacePhone } = usePrototype()
  const [pinFor, setPinFor] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const allowed = pinSwitchAllowed(phone.lastCheckInAt, openedAt)
  const active = snapshot.users.find((item) => item.id === phone.activeUserId)
  const activeMembership = snapshot.memberships.find((item) => item.userId === phone.activeUserId && item.scope === 'school')
  const school = snapshot.schools.find((item) => item.id === (phone.usedAtSchoolId ?? activeMembership?.schoolId))

  const switchPeople = phone.pins
    .map((item) => {
      const user = snapshot.users.find((person) => person.id === item.userId)
      const membership = snapshot.memberships.find((entry) => entry.userId === item.userId && entry.scope === 'school' && entry.status === 'active')
      if (!user || !membership) return null
      return { userId: item.userId, name: `${user.firstName} ${user.surname}`, role: roleLabel(membership.role) }
    })
    .filter((item): item is { userId: string; name: string; role: string } => Boolean(item))

  function signOut() {
    replacePhone({ ...phone, activeUserId: null })
    setPinFor(null)
    setMessage('')
  }

  function trySwitch(event: FormEvent) {
    event.preventDefault()
    if (!pinFor) return
    if (!pinSwitchAllowed(phone.lastCheckInAt, nowIso())) {
      setMessage('This phone needs a signal before it will switch person.')
      return
    }
    const saved = phone.pins.find((item) => item.userId === pinFor)
    if (!saved || saved.pin !== pin) {
      setMessage('That PIN does not match.')
      return
    }
    replacePhone({ ...phone, activeUserId: pinFor })
    setPin('')
    setPinFor(null)
    setMessage('')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">This phone</h1>
      <p className="mt-3 rounded-xl bg-white px-4 py-4 text-lg font-semibold text-navy">
        {phone.syncStatus === 'sent' ? 'Sent' : 'Saved on this phone'}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Lessons and drafts stay on the phone until they are sent. Each item stays with the person who made it.
      </p>
      {phone.syncStatus === 'saved' && (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 h-14 w-full text-lg"
          onClick={() => {
            const storage = prototypeStorage()
            void flushOutbox(storage, async (item) => {
              if (!apiBase()) return false
              await apiSend(item.path, { token: item.token ?? undefined, body: item.body })
              return true
            }).then((result) => {
              if (result.saved === 0) replacePhone({ ...phone, syncStatus: 'sent' })
            })
          }}
        >
          Send now
        </Button>
      )}
      {activeMembership?.schoolId && (
        <CountForm
          schoolId={activeMembership.schoolId}
          token={phone.apiToken}
          onSaved={() => replacePhone({ ...phone, syncStatus: 'saved' })}
        />
      )}
      <p className="mt-5 text-base">
        Using the phone now:{' '}
        <span className="font-semibold">{active ? `${active.firstName} ${active.surname}` : 'Nobody. Sign in below.'}</span>
      </p>
      {school && <p className="mt-1 text-sm">School on this phone: {school.name}</p>}
      {!phone.usedAtSchoolId && activeMembership?.schoolId && (
        <Button
          type="button"
          className="mt-3 h-14 w-full text-lg"
          onClick={() => replacePhone({ ...phone, usedAtSchoolId: activeMembership.schoolId })}
        >
          Mark this phone as used at this school
        </Button>
      )}
      {phone.usedAtSchoolId && (
        <p className="mt-3 text-sm font-semibold text-navy">Marked: used at this school.</p>
      )}

      <h2 className="mt-8 text-lg font-semibold text-navy">Switch person</h2>
      <p className="mt-2 text-sm leading-relaxed">
        The PIN works offline for 7 days after the last time this phone checked in. After that, the phone needs a
        signal before it will switch person.
      </p>
      {phone.lastCheckInAt && (
        <p className="mt-2 text-sm text-muted">Last check-in {formatWhen(phone.lastCheckInAt)}.</p>
      )}
      {!allowed && (
        <p className="mt-3 rounded-xl bg-gold-soft px-4 py-3 text-sm text-navy" role="status">
          This phone needs a signal before it will switch person.
        </p>
      )}
      <ul className="mt-3 grid gap-2">
        {switchPeople.map((person) => (
          <li key={person.userId}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-left"
              onClick={() => {
                setPinFor(person.userId)
                setPin('')
                setMessage('')
              }}
            >
              <span>
                <span className="block font-semibold text-navy">{person.name}</span>
                <span className="text-sm">{person.role}</span>
              </span>
              {phone.activeUserId === person.userId && <span className="text-sm font-semibold text-good">Using</span>}
            </button>
          </li>
        ))}
      </ul>
      {pinFor && allowed && (
        <form onSubmit={trySwitch} className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="switch-pin">
            PIN for {switchPeople.find((person) => person.userId === pinFor)?.name}
            <input
              id="switch-pin"
              className={fieldClass('h-16 text-center text-2xl tracking-widest')}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>
          <Button type="submit" className="h-14 text-lg">
            Switch person
          </Button>
        </form>
      )}
      {message && (
        <p className="mt-3 text-sm text-bad" role="alert">
          {message}
        </p>
      )}
      <div className="mt-4 grid gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-12"
          onClick={() =>
            replacePhone({
              ...phone,
              lastCheckInAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }
        >
          Preview: last check-in was 8 days ago
        </Button>
        {!allowed && (
          <Button type="button" variant="secondary" className="h-14" onClick={() => replacePhone({ ...phone, lastCheckInAt: new Date().toISOString() })}>
            Check in now
          </Button>
        )}
      </div>
      <Button type="button" variant="outline" className="mt-6 h-14 w-full text-lg" onClick={signOut}>
        Sign out
      </Button>
      <Link to="/join/people" className="mt-4 inline-flex min-h-12 items-center text-base font-semibold text-blue">
        People at this school
      </Link>
    </div>
  )
}

function CountForm({ schoolId, token, onSaved }: { schoolId: string; token: string | null; onSaved: () => void }) {
  const [mainMeal, setMainMeal] = useState('')
  const [breakfast, setBreakfast] = useState('')

  return (
    <form
      className="mt-4 grid gap-2 rounded-xl border border-line bg-white p-3"
      onSubmit={(event) => {
        event.preventDefault()
        const clientId = crypto.randomUUID()
        enqueueOutbox(prototypeStorage(), {
          id: clientId,
          path: `/v1/schools/${schoolId}/daily-stats`,
          token,
          createdAt: new Date().toISOString(),
          body: {
            clientId,
            feedingDate: new Date().toISOString().slice(0, 10),
            breakfastFed: Number(breakfast || 0),
            mainMealFed: Number(mainMeal || 0),
            mainMealTime: '12:20',
            clientRecordedAt: new Date().toISOString(),
          },
        })
        onSaved()
        setMainMeal('')
        setBreakfast('')
      }}
    >
      <p className="font-semibold text-navy">Today's feeding count</p>
      <p className="text-sm text-muted">If there is no signal, this stays on the phone until Send now.</p>
      <label className="text-sm font-semibold text-navy" htmlFor="count-breakfast">
        Breakfast
        <input id="count-breakfast" inputMode="numeric" className={fieldClass('mt-1 h-12')} value={breakfast} onChange={(event) => setBreakfast(event.target.value)} />
      </label>
      <label className="text-sm font-semibold text-navy" htmlFor="count-main">
        Main meal
        <input id="count-main" inputMode="numeric" className={fieldClass('mt-1 h-12')} value={mainMeal} onChange={(event) => setMainMeal(event.target.value)} />
      </label>
      <Button type="submit" className="h-12">
        Save count
      </Button>
    </form>
  )
}
