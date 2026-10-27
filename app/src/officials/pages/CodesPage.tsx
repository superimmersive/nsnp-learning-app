import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { makeJoinCode } from '../actions'
import { actorName, maskPhone, roleLabel } from '../metrics'
import { useOfficials } from '../store'
import { fieldClass } from '../present'
import { Section } from '../ui'
import { formatDate } from '../time'
import type { JoinCode } from '../types'

type IntendedRole = 'nsnp_coordinator' | 'principal'

export function CodesPage() {
  const { snapshot, dispatch } = useOfficials()
  const schools = [...snapshot.schools].sort((a, b) => a.name.localeCompare(b.name))
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '')
  const [cellphone, setCellphone] = useState('')
  const [intendedRole, setIntendedRole] = useState<IntendedRole>('nsnp_coordinator')
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<{ code: string; school: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nextPhone, setNextPhone] = useState('')

  function issue(event: FormEvent) {
    event.preventDefault()
    const digits = cellphone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Enter a cellphone number with at least 10 digits.')
      return
    }
    const code = makeJoinCode()
    const school = schools.find((item) => item.id === schoolId)
    dispatch({ type: 'issue_code', schoolId, cellphone: cellphone.trim(), intendedRole, code })
    setIssued({ code, school: school?.name ?? 'the school' })
    setCellphone('')
    setError('')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Join codes</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        A code lets one coordinator or principal join one school. It expires after 14 days. The phone only keeps the last
        four digits in the audit log. The coordinator types it on{' '}
        <Link to="/join/coordinator" className="font-semibold text-blue">
          Join this school
        </Link>
        . A code issued here is saved in this browser for that screen.
      </p>

      <Section title="Issue a code">
        <form onSubmit={issue} className="grid max-w-xl gap-3 rounded-xl border border-line bg-white p-4">
          <label className="text-sm font-semibold text-navy" htmlFor="code-school">
            School
          </label>
          <select id="code-school" className={fieldClass()} value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name} ({school.schoolNumber})
              </option>
            ))}
          </select>
          <label className="text-sm font-semibold text-navy" htmlFor="code-phone">
            Coordinator cellphone
          </label>
          <input
            id="code-phone"
            className={fieldClass()}
            inputMode="tel"
            autoComplete="tel"
            placeholder="082 000 0000"
            value={cellphone}
            onChange={(event) => setCellphone(event.target.value)}
          />
          <label className="text-sm font-semibold text-navy" htmlFor="code-role">
            Who the code is for
          </label>
          <select
            id="code-role"
            className={fieldClass()}
            value={intendedRole}
            onChange={(event) => setIntendedRole(event.target.value as IntendedRole)}
          >
            <option value="nsnp_coordinator">NSNP coordinator</option>
            <option value="principal">Principal</option>
          </select>
          {error && <p className="text-sm text-bad">{error}</p>}
          <Button type="submit">Issue code</Button>
          {issued && (
            <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-navy">
              Code <span className="font-semibold tracking-wide">{issued.code}</span> is ready for {issued.school}. Read
              it to the coordinator. This example is not sent by SMS.
            </p>
          )}
        </form>
      </Section>

      <Section title="Codes on the trial">
        <div className="grid gap-3">
          {snapshot.joinCodes.map((row) => {
            const school = snapshot.schools.find((item) => item.id === row.schoolId)
            const status = codeStatus(row, snapshot.asOf)
            const canChange = status === 'ready'
            return (
              <article key={row.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold tracking-wide text-navy">{row.code}</p>
                    <p className="mt-1 text-sm">
                      {school?.name ?? 'Unknown school'} · EMIS {school?.schoolNumber ?? '—'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{statusLabel(status)}</p>
                </div>
                <p className="mt-2 text-sm text-ink">
                  {roleLabel(row.intendedRole)} · cellphone {maskPhone(row.cellphone)} · expires {formatDate(row.expiresAt.slice(0, 10))}
                </p>
                <p className="mt-1 text-sm text-muted">Issued by {actorName(snapshot, row.issuedBy)}</p>
                {canChange && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    {editingId === row.id ? (
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const digits = nextPhone.replace(/\D/g, '')
                          if (digits.length < 10) return
                          dispatch({ type: 'update_code_phone', codeId: row.id, cellphone: nextPhone.trim() })
                          setEditingId(null)
                          setNextPhone('')
                        }}
                      >
                        <label className="text-sm font-semibold text-navy" htmlFor={`phone-${row.id}`}>
                          New cellphone
                        </label>
                        <input
                          id={`phone-${row.id}`}
                          className={fieldClass('w-44')}
                          inputMode="tel"
                          value={nextPhone}
                          onChange={(event) => setNextPhone(event.target.value)}
                        />
                        <Button type="submit" size="sm">
                          Save number
                        </Button>
                      </form>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(row.id)
                          setNextPhone('')
                        }}
                      >
                        Change cellphone
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'withdraw_code', codeId: row.id })}>
                      Withdraw code
                    </Button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function codeStatus(row: JoinCode, asOf: string): 'ready' | 'used' | 'withdrawn' | 'expired' {
  if (row.withdrawnAt) return 'withdrawn'
  if (row.usedAt) return 'used'
  if (new Date(row.expiresAt).getTime() <= new Date(asOf).getTime()) return 'expired'
  return 'ready'
}

function statusLabel(status: ReturnType<typeof codeStatus>): string {
  switch (status) {
    case 'ready':
      return 'Waiting to be used'
    case 'used':
      return 'Used'
    case 'withdrawn':
      return 'Withdrawn'
    case 'expired':
      return 'Expired'
  }
}
