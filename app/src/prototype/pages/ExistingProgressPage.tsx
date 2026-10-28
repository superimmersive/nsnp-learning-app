import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { loadProgress } from '@/lib/progress'
import { copyPassedLessons } from '../join'
import { prototypeStorage } from '../storage'
import { usePrototype } from '../store'

export function ExistingProgressPage() {
  const { snapshot, phone, replaceSnapshot, replacePhone } = usePrototype()
  const navigate = useNavigate()
  const stored = loadProgress(prototypeStorage())
  const [useExample, setUseExample] = useState(false)
  const hasReal = Boolean(stored.name.trim() || stored.school.trim() || Object.values(stored.modules).some((module) => module?.passed))
  const name = hasReal ? stored.name || 'Name not saved' : useExample ? 'Thandi Maseko' : 'Not saved on this phone'
  const school = hasReal ? stored.school || 'School not saved' : useExample ? 'Riverbend Example Primary' : 'Not saved on this phone'
  const next = phone.continueTo ?? '/join/phone'

  function choose(answer: 'yes' | 'no') {
    if (answer === 'yes' && phone.activeUserId && hasReal) {
      replaceSnapshot(copyPassedLessons(snapshot, phone.activeUserId, stored, new Date().toISOString()))
    }
    replacePhone({ ...phone, existingProgressChoice: answer })
    navigate(next)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold leading-tight text-navy">
        Send the lessons already passed on this phone to your account?
      </h1>
      <p className="mt-3 text-base leading-relaxed">
        This phone already has a name and school saved with the lessons. Nothing is sent unless you say yes. A shared
        phone might be holding someone else’s name.
      </p>
      <div className="mt-4 rounded-xl border border-line bg-white p-4 text-base">
        <p>
          Name on this phone: <span className="font-semibold">{name || 'Not saved'}</span>
        </p>
        <p className="mt-2">
          School on this phone: <span className="font-semibold">{school || 'Not saved'}</span>
        </p>
      </div>
      {!hasReal && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This browser has no lesson progress saved. The question above is the real prompt. You can preview it with an
          example name. That example is not written into the lessons.
        </p>
      )}
      {!hasReal && !useExample && (
        <Button type="button" variant="outline" className="mt-3 h-14 w-full" onClick={() => setUseExample(true)}>
          Preview with an example name
        </Button>
      )}
      <div className="mt-4 grid gap-3">
        <Button type="button" className="h-14 text-lg" onClick={() => choose('yes')}>
          Yes, send them
        </Button>
        <Button type="button" variant="outline" className="h-14 text-lg" onClick={() => choose('no')}>
          No, leave them on this phone
        </Button>
      </div>
    </div>
  )
}
