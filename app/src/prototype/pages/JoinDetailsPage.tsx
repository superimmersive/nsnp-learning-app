import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { fieldClass } from '@/officials/present'
import { apiBase } from '@/sync/config'
import { checkCoordinatorCode, checkStaffCode, codeProblemText, phoneDigits, type CodeProblem } from '../access'
import type { JoinPath, StaffJoinRole } from '../phone'
import { usePrototype } from '../store'

const ROLES: { id: StaffJoinRole; label: string }[] = [
  { id: 'food_handler', label: 'Food handler' },
  { id: 'smt_member', label: 'SMT member' },
  { id: 'principal', label: 'Principal' },
]

export function JoinDetailsPage({ path }: { path: JoinPath }) {
  const { snapshot, phone, replacePhone } = usePrototype()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [cellphone, setCellphone] = useState('')
  const [role, setRole] = useState<StaffJoinRole>('food_handler')
  const [problem, setProblem] = useState<CodeProblem | null>(null)
  const [formError, setFormError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    setProblem(null)
    setFormError('')
    if (!firstName.trim() || !surname.trim()) {
      setFormError('Enter your first name and surname.')
      return
    }
    if (phoneDigits(cellphone).length < 10) {
      setFormError('Enter a cellphone number with at least 10 digits.')
      return
    }
    if (apiBase()) {
      replacePhone({
        ...phone,
        draft: {
          path,
          code: code.trim().toUpperCase(),
          firstName: firstName.trim(),
          surname: surname.trim(),
          cellphone: cellphone.trim(),
          role: path === 'coordinator' ? 'nsnp_coordinator' : role,
          schoolId: '',
          joinCodeId: null,
          agreed: false,
          continueTo: path === 'coordinator' ? '/join/pin' : '/join/waiting',
        },
      })
      navigate('/join/notice')
      return
    }
    const now = new Date().toISOString()
    if (path === 'coordinator') {
      const result = checkCoordinatorCode(snapshot, code, cellphone, now)
      if (!result.ok) {
        setProblem(result.problem)
        return
      }
      replacePhone({
        ...phone,
        draft: {
          path,
          code: result.joinCode.code,
          firstName: firstName.trim(),
          surname: surname.trim(),
          cellphone: cellphone.trim(),
          role: 'nsnp_coordinator',
          schoolId: result.school.id,
          joinCodeId: result.joinCode.id,
          agreed: false,
          continueTo: '/join/pin',
        },
      })
    } else {
      const result = checkStaffCode(snapshot, code)
      if (!result.ok) {
        setProblem(result.problem)
        return
      }
      replacePhone({
        ...phone,
        draft: {
          path,
          code: result.staffCode.code,
          firstName: firstName.trim(),
          surname: surname.trim(),
          cellphone: cellphone.trim(),
          role,
          schoolId: result.school.id,
          joinCodeId: null,
          agreed: false,
          continueTo: '/join/waiting',
        },
      })
    }
    navigate('/join/notice')
  }

  const title = path === 'coordinator' ? 'Join as coordinator' : 'Join as school staff'
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Join this school</h1>
      <p className="mt-2 text-base leading-relaxed">{title}. Lessons stay available if you only want to read them.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/join/coordinator"
          className={`inline-flex h-14 items-center justify-center rounded-lg px-3 text-center text-base font-semibold ${
            path === 'coordinator' ? 'bg-navy text-white' : 'border border-line bg-white text-navy'
          }`}
        >
          Coordinator code
        </Link>
        <Link
          to="/join/staff"
          className={`inline-flex h-14 items-center justify-center rounded-lg px-3 text-center text-base font-semibold ${
            path === 'staff' ? 'bg-navy text-white' : 'border border-line bg-white text-navy'
          }`}
        >
          Staff code
        </Link>
      </div>
      {problem === 'expired' && (
        <div className="mt-4 rounded-xl border border-bad bg-bad-soft p-4" role="alert">
          <h2 className="text-lg font-semibold text-bad">This code has expired</h2>
          <p className="mt-2 text-sm leading-relaxed">{codeProblemText('expired', path)}</p>
        </div>
      )}
      {problem && problem !== 'expired' && (
        <p className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-sm leading-relaxed text-bad" role="alert">
          {codeProblemText(problem, path)}
        </p>
      )}
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <Field id="join-code" label={path === 'coordinator' ? 'School code' : 'Staff code'}>
          <input
            id="join-code"
            className={fieldClass('h-14 text-lg uppercase tracking-wide')}
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field id="join-first" label="First name">
          <input id="join-first" className={fieldClass('h-14 text-lg')} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </Field>
        <Field id="join-surname" label="Surname">
          <input id="join-surname" className={fieldClass('h-14 text-lg')} autoComplete="family-name" value={surname} onChange={(event) => setSurname(event.target.value)} />
        </Field>
        <Field id="join-phone" label="Cellphone">
          <input
            id="join-phone"
            className={fieldClass('h-14 text-lg')}
            inputMode="tel"
            autoComplete="tel"
            placeholder="082 000 0000"
            value={cellphone}
            onChange={(event) => setCellphone(event.target.value)}
          />
        </Field>
        {path === 'staff' && (
          <fieldset>
            <legend className="text-sm font-semibold text-navy">Your role</legend>
            <div className="mt-2 grid gap-2">
              {ROLES.map((item) => (
                <label key={item.id} className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-white px-3 text-base">
                  <input type="radio" name="role" checked={role === item.id} onChange={() => setRole(item.id)} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {formError && (
          <p className="text-sm text-bad" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" className="h-14 text-lg">
          Continue
        </Button>
      </form>
      <Link to="/join/recover" className="mt-6 inline-flex min-h-12 items-center text-base font-semibold text-blue">
        New phone? Sign in with your cellphone
      </Link>
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-navy" htmlFor={id}>
      {label}
      {children}
    </label>
  )
}
