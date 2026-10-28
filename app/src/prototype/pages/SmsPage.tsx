import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { loadProgress } from '@/lib/progress'
import { fieldClass } from '@/officials/present'
import { ApiError, apiSend } from '@/sync/client'
import { apiBase } from '@/sync/config'
import { checkSmsCode, DEMO_SMS_CODE } from '../access'
import { claimFromDraft, hasStoredLessons } from '../join'
import { prototypeStorage } from '../storage'
import { usePrototype } from '../store'

export function SmsPage() {
  const { snapshot, phone, replaceSnapshot, replacePhone } = usePrototype()
  const navigate = useNavigate()
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const draft = phone.draft

  if (!draft?.agreed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy">SMS code</h1>
        <p className="mt-3 text-base">Read the privacy notice before the SMS code.</p>
        <Link to="/join/notice" className="mt-4 inline-flex h-14 items-center font-semibold text-blue">
          Privacy notice
        </Link>
      </div>
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft?.agreed) return
    if (apiBase()) {
      void (async () => {
        try {
          const json = (await apiSend('/v1/auth/sms/verify', {
            body: { cellphone: draft.cellphone, code: typed.trim(), purpose: 'join' },
          })) as { token?: string; userId?: string }
          const stored = loadProgress(prototypeStorage())
          const ask = phone.existingProgressChoice == null && hasStoredLessons(stored)
          replacePhone({
            ...phone,
            activeUserId: json.userId ?? draft.remoteUserId ?? phone.activeUserId,
            apiToken: json.token ?? null,
            syncStatus: 'saved',
            continueTo: draft.continueTo,
            draft: null,
          })
          navigate(ask ? '/join/existing' : draft.continueTo)
        } catch (caught) {
          setError(caught instanceof ApiError ? caught.message : 'That code does not match.')
        }
      })()
      return
    }
    if (!checkSmsCode(typed)) {
      setError('That code does not match. Use the demo code shown on this screen.')
      return
    }
    const at = new Date().toISOString()
    const userId = draft.path === 'coordinator' ? `user-${draft.joinCodeId}` : `user-joined-${snapshot.users.length + 1}`
    const next = claimFromDraft(snapshot, draft, at)
    replaceSnapshot(next)
    const stored = loadProgress(prototypeStorage())
    const ask = phone.existingProgressChoice == null && hasStoredLessons(stored)
    replacePhone({
      ...phone,
      activeUserId: userId,
      syncStatus: 'saved',
      continueTo: draft.continueTo,
      draft: null,
    })
    navigate(ask ? '/join/existing' : draft.continueTo)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Enter the SMS code</h1>
      <p className="mt-2 text-base leading-relaxed">
        A real phone would get a text message. This prototype shows the code here instead. It is not stored after you
        use it.
      </p>
      <p className="mt-4 rounded-xl bg-gold-soft px-4 py-4 text-lg font-semibold text-navy">
        Demo SMS code: {draft.demoCode ?? DEMO_SMS_CODE}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor="sms-code">
          One-time code
          <input
            id="sms-code"
            className={fieldClass('h-14 text-center text-2xl tracking-widest')}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </label>
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="h-14 text-lg">
          Continue
        </Button>
      </form>
    </div>
  )
}
