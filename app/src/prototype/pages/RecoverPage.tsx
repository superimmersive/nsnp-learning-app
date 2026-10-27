import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { MODULES } from '@/officials/metrics'
import { fieldClass } from '@/officials/present'
import { checkSmsCode, DEMO_SMS_CODE, phoneDigits, phonesMatch } from '../access'
import { usePrototype } from '../store'

export function RecoverPage() {
  const { snapshot, phone, replacePhone } = usePrototype()
  const [cellphone, setCellphone] = useState('')
  const [step, setStep] = useState<'phone' | 'sms' | 'loaded'>('phone')
  const [userId, setUserId] = useState<string | null>(null)
  const [sms, setSms] = useState('')
  const [error, setError] = useState('')
  const user = snapshot.users.find((item) => item.id === userId)
  const passed = snapshot.moduleProgress.filter((item) => item.userId === userId && item.passed)

  function findPhone(event: FormEvent) {
    event.preventDefault()
    if (phoneDigits(cellphone).length < 10) {
      setError('Enter a cellphone number with at least 10 digits.')
      return
    }
    const match = snapshot.users.find((item) => phonesMatch(item.cellphone, cellphone) && item.status === 'active')
    if (!match) {
      setError('We do not have this cellphone on the trial. Ask your coordinator or the district official.')
      return
    }
    setUserId(match.id)
    setError('')
    setStep('sms')
  }

  function confirmSms(event: FormEvent) {
    event.preventDefault()
    if (!checkSmsCode(sms) || !userId) {
      setError('That code does not match. Use the demo code shown on this screen.')
      return
    }
    replacePhone({
      ...phone,
      activeUserId: userId,
      syncStatus: 'sent',
      lastCheckInAt: new Date().toISOString(),
    })
    setError('')
    setStep('loaded')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold leading-tight text-navy">New phone? Sign in with your cellphone</h1>
      <p className="mt-2 text-base leading-relaxed">
        There is no password. The SMS code loads the lessons stored for this number. The PIN on the old phone does not
        work here.
      </p>
      {step === 'phone' && (
        <form onSubmit={findPhone} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="recover-phone">
            Cellphone
            <input
              id="recover-phone"
              className={fieldClass('h-14 text-lg')}
              inputMode="tel"
              autoComplete="tel"
              placeholder="082 000 2000"
              value={cellphone}
              onChange={(event) => setCellphone(event.target.value)}
            />
          </label>
          <p className="text-sm leading-relaxed">Demo: 082 000 2000 is Thandi Maseko at Riverbend Example Primary.</p>
          {error && (
            <p className="text-sm text-bad" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="h-14 text-lg">
            Send SMS code
          </Button>
        </form>
      )}
      {step === 'sms' && (
        <form onSubmit={confirmSms} className="mt-4 grid gap-3">
          <p className="rounded-xl bg-gold-soft px-4 py-4 text-lg font-semibold text-navy">Demo SMS code: {DEMO_SMS_CODE}</p>
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="recover-sms">
            One-time code
            <input
              id="recover-sms"
              className={fieldClass('h-14 text-center text-2xl tracking-widest')}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={sms}
              onChange={(event) => setSms(event.target.value)}
            />
          </label>
          {error && (
            <p className="text-sm text-bad" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="h-14 text-lg">
            Load my lessons
          </Button>
        </form>
      )}
      {step === 'loaded' && user && (
        <div className="mt-4">
          <p className="text-lg font-semibold text-navy">
            Lessons loaded for {user.firstName} {user.surname}.
          </p>
          <ul className="mt-3 grid gap-2">
            {passed.length === 0 && <li className="text-sm">No lessons passed yet.</li>}
            {passed.map((item) => {
              const module = MODULES.find((entry) => entry.id === item.moduleId)
              return (
                <li key={item.moduleId} className="rounded-lg bg-white px-3 py-3 text-sm">
                  Passed {module ? `${module.number}. ${module.title}` : item.moduleId}
                </li>
              )
            })}
          </ul>
          <Button asChild className="mt-4 h-14 w-full text-lg">
            <Link to="/join/phone">This phone</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
