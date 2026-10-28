import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { fieldClass } from '@/officials/present'
import { checkPin, pinProblemText } from '../access'
import { usePrototype } from '../store'

export function PinPage() {
  const { snapshot, phone, replacePhone } = usePrototype()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const user = snapshot.users.find((item) => item.id === phone.activeUserId)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone.activeUserId) {
      setError('Join a school before you set a PIN.')
      return
    }
    const problem = checkPin(pin)
    if (problem) {
      setError(pinProblemText(problem))
      return
    }
    if (pin !== again) {
      setError('Type the same 4 digits again.')
      return
    }
    const pins = phone.pins.filter((item) => item.userId !== phone.activeUserId)
    replacePhone({
      ...phone,
      pins: [...pins, { userId: phone.activeUserId, pin }],
      lastCheckInAt: new Date().toISOString(),
    })
    navigate('/join/phone')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Set a 4-digit PIN</h1>
      <p className="mt-2 text-base leading-relaxed">
        {user ? `${user.firstName} ${user.surname}, this` : 'This'} PIN switches person on this phone. It does not open
        the account on a new phone. A new phone always needs the SMS code.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="pin">
          PIN
          <input
            id="pin"
            className={fieldClass('h-16 text-center text-2xl tracking-widest')}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="pin-again">
          PIN again
          <input
            id="pin-again"
            className={fieldClass('h-16 text-center text-2xl tracking-widest')}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={again}
            onChange={(event) => setAgain(event.target.value)}
          />
        </label>
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="h-14 text-lg">
          Save PIN
        </Button>
      </form>
      <Link to="/join/phone" className="mt-4 inline-flex min-h-12 items-center text-base font-semibold text-blue">
        This phone
      </Link>
    </div>
  )
}
