import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { checkPin, pinProblemText } from '@/prototype/access'
import { ApiError, apiSend } from '@/sync/client'
import { fieldClass } from './present'
import { isDashboardRole, type OfficialSession } from './session'

type Step = 'phone' | 'sms' | 'pin' | 'denied'

type MeResponse = {
  membership?: { id?: string; role?: string; userId?: string }
}

export function OfficialSignIn({ onSignedIn }: { onSignedIn: (session: OfficialSession) => void }) {
  const [step, setStep] = useState<Step>('phone')
  const [cellphone, setCellphone] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ token: string; userId: string; membershipId: string; role: string; deviceId: string } | null>(null)

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const json = (await apiSend('/v1/auth/recover', { body: { cellphone } })) as { demoCode?: string }
      setDemoCode(json.demoCode ?? '')
      setStep('sms')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The SMS code was not sent')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const verified = (await apiSend('/v1/auth/sms/verify', {
        body: { cellphone, code: code.trim(), purpose: 'recover' },
      })) as { token?: string; userId?: string; membershipId?: string }
      if (!verified.token) throw new ApiError(400, 'Sign in again')
      const me = (await apiSend('/v1/me', { token: verified.token })) as MeResponse
      const role = me.membership?.role ?? ''
      const membershipId = me.membership?.id ?? verified.membershipId ?? ''
      const userId = me.membership?.userId ?? verified.userId ?? ''
      if (!isDashboardRole(role)) {
        setStep('denied')
        return
      }
      setPending({
        token: verified.token,
        userId,
        membershipId,
        role,
        deviceId: `device-${crypto.randomUUID()}`,
      })
      setStep('pin')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That SMS code does not match')
    } finally {
      setBusy(false)
    }
  }

  async function savePin(event: FormEvent) {
    event.preventDefault()
    if (!pending) return
    const problem = checkPin(pin)
    if (problem) {
      setError(pinProblemText(problem))
      return
    }
    if (pin !== again) {
      setError('Type the same 4 digits again.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await apiSend('/v1/me/pin', { token: pending.token, body: { pin, deviceId: pending.deviceId } })
      onSignedIn({
        token: pending.token,
        userId: pending.userId,
        membershipId: pending.membershipId,
        role: pending.role,
        deviceId: pending.deviceId,
      })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The PIN was not saved')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-navy">Sign in</h1>
      <p className="mt-2 text-base leading-relaxed">
        District officials and the super-admin sign in with a cellphone and an SMS code, then a PIN on this device.
      </p>
      {step === 'phone' && (
        <form onSubmit={(event) => void sendCode(event)} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="official-phone">
            Cellphone
            <input
              id="official-phone"
              className={fieldClass('h-14 text-lg')}
              inputMode="tel"
              autoComplete="tel"
              value={cellphone}
              onChange={(event) => setCellphone(event.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <Button type="submit" className="h-14 text-lg" disabled={busy}>
            Send SMS code
          </Button>
        </form>
      )}
      {step === 'sms' && (
        <form onSubmit={(event) => void verifyCode(event)} className="mt-4 grid gap-3">
          {demoCode && (
            <p className="rounded-xl bg-gold-soft px-4 py-4 text-lg font-semibold text-navy">Demo SMS code: {demoCode}</p>
          )}
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="official-sms">
            One-time code
            <input
              id="official-sms"
              className={fieldClass('h-14 text-center text-2xl tracking-widest')}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <Button type="submit" className="h-14 text-lg" disabled={busy}>
            Continue
          </Button>
        </form>
      )}
      {step === 'pin' && (
        <form onSubmit={(event) => void savePin(event)} className="mt-4 grid gap-3">
          <p className="text-base">This PIN stays on this device. A new device needs the SMS code again.</p>
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="official-pin">
            PIN
            <input
              id="official-pin"
              className={fieldClass('h-16 text-center text-2xl tracking-widest')}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="official-pin-again">
            PIN again
            <input
              id="official-pin-again"
              className={fieldClass('h-16 text-center text-2xl tracking-widest')}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={again}
              onChange={(event) => setAgain(event.target.value)}
            />
          </label>
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <Button type="submit" className="h-14 text-lg" disabled={busy}>
            Save PIN
          </Button>
        </form>
      )}
      {step === 'denied' && (
        <p className="mt-4 text-base" role="alert">
          This dashboard is for a district official or the super-admin. This cellphone has a different role.
        </p>
      )}
    </div>
  )
}
