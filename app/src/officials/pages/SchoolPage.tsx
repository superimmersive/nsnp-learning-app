import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { countMark, MODULES, monthlyMark, peopleAtSchool, roleLabel, schoolRows } from '../metrics'
import { useOfficials } from '../store'
import { kindLabel } from '../present'
import { CountBadge, IssueActions, MonthlyBadge, Section, ToneBadge } from '../ui'
import { formatDate, formatMonth, formatWhen, monthlyDueDate } from '../time'
import type { ViewerRole } from '../types'

export function SchoolPage() {
  const { schoolId = '' } = useParams()
  const { snapshot, viewingAs, dispatch } = useOfficials()
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [gate, setGate] = useState<{ schoolId: string; role: ViewerRole } | null>(null)
  const unlocked = viewingAs !== 'super_admin' || (gate?.schoolId === schoolId && gate.role === viewingAs)
  const school = snapshot.schools.find((item) => item.id === schoolId)
  const row = schoolRows(snapshot).find((item) => item.schoolId === schoolId)

  if (!school || !row) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy">School not on the trial list</h1>
        <Link to="/officials" className="mt-4 inline-block font-semibold text-blue">
          Back to the district
        </Link>
      </div>
    )
  }

  if (viewingAs === 'super_admin' && !unlocked) {
    return (
      <form
        className="mx-auto max-w-lg rounded-xl border border-line bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = reason.trim()
          if (!trimmed) return
          dispatch({ type: 'support_view', schoolId, reason: trimmed })
          setGate({ schoolId, role: 'super_admin' })
        }}
      >
        <h1 className="text-xl font-semibold text-navy">Reason for opening this school</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Super-admin access is written to the audit log. Say why you are opening {school.name}.
        </p>
        <label className="mt-4 block text-sm font-semibold text-navy" htmlFor="support-reason">
          Reason
        </label>
        <textarea
          id="support-reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 min-h-28 w-full rounded-lg border border-line px-3 py-2 text-base"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">Open school</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/officials')}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  const people = peopleAtSchool(snapshot, school.id)
  const coordinator = people.find((person) => person.role === 'nsnp_coordinator' && person.status === 'active')
  const stats = snapshot.dailyStats
    .filter((stat) => stat.schoolId === school.id && !stat.replacesId)
    .sort((a, b) => b.feedingDate.localeCompare(a.feedingDate))
  const packs = snapshot.monthlyPacks
    .filter((pack) => pack.schoolId === school.id)
    .sort((a, b) => b.period.localeCompare(a.period))
  const issues = snapshot.issues.filter((issue) => issue.schoolId === school.id)

  return (
    <div>
      <Link to="/officials" className="text-sm font-semibold text-blue">
        All trial schools
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{school.name}</h1>
          <p className="mt-1 text-sm text-ink">
            EMIS {school.schoolNumber}
            {row.phase ? ` · ${row.phase}` : ''}
            {school.quintile != null ? ` · Quintile ${school.quintile}` : ''}
            {school.enrolment != null ? ` · Enrolment ${school.enrolment}` : ''}
          </p>
          <p className="mt-2 text-sm">
            Coordinator: <span className="font-semibold">{row.coordinator}</span>
          </p>
        </div>
        <ToneBadge tone={row.tone} />
      </div>
      {row.aboveEnrolment && (
        <p className="mt-4 rounded-lg bg-gold-soft px-4 py-3 text-sm text-navy">
          The latest main-meal count is above the enrolment on the list. Phone the school. This is a prompt to check, not
          a finding.
        </p>
      )}

      <Section title="Modules passed">
        <p className="text-sm text-muted">Passed modules only. Individual quiz answers are not shown.</p>
        <ul className="mt-3 grid gap-2 sm:hidden">
          {people.length === 0 && <li className="text-sm">Nobody has joined this school yet.</li>}
          {people.map((person) => (
            <li key={person.membershipId} className="rounded-xl border border-line bg-white p-3 text-sm">
              <p className="font-semibold text-navy">{person.name}</p>
              <p className="mt-1">
                {roleLabel(person.role)} · {person.status === 'active' ? 'Approved' : 'Waiting for approval'}
              </p>
              <p className="mt-1">{person.passed} of 11 passed</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white sm:block">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-paper text-navy">
              <tr>
                <th className="px-3 py-3">Person</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Passed</th>
              </tr>
            </thead>
            <tbody>
              {people.length === 0 && (
                <tr>
                  <td className="px-3 py-3" colSpan={4}>
                    Nobody has joined this school yet.
                  </td>
                </tr>
              )}
              {people.map((person) => (
                <tr key={person.membershipId} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{person.name}</td>
                  <td className="px-3 py-3">{roleLabel(person.role)}</td>
                  <td className="px-3 py-3">{person.status === 'active' ? 'Approved' : 'Waiting for approval'}</td>
                  <td className="px-3 py-3">{person.passed} of 11</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {coordinator && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {MODULES.map((module) => {
              const passed = coordinator.moduleIds.includes(module.id)
              return (
                <li key={module.id} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
                  <span className={passed ? 'font-semibold text-good' : 'text-muted'}>
                    {passed ? 'Passed' : 'Not yet'}
                  </span>
                  <span className="mt-0.5 block text-ink">
                    {module.number}. {module.title}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Daily feeding counts">
        <ul className="grid gap-2 sm:hidden">
          {stats.length === 0 && <li className="text-sm">No counts yet.</li>}
          {stats.map((stat) => (
            <li key={stat.id} className="rounded-xl border border-line bg-white p-3 text-sm">
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold text-navy">{formatDate(stat.feedingDate)}</span>
                <CountBadge mark={countMark(stat)} />
              </span>
              <p className="mt-2">
                Breakfast {stat.breakfastFed} · Main meal {stat.mainMealFed}
              </p>
              <p className="mt-1">Recorded {formatWhen(stat.clientRecordedAt)}</p>
              <p className="mt-1">Received {formatWhen(stat.serverReceivedAt)}</p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white sm:block">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-paper text-navy">
              <tr>
                <th className="px-3 py-3">Feeding day</th>
                <th className="px-3 py-3">Breakfast</th>
                <th className="px-3 py-3">Main meal</th>
                <th className="px-3 py-3">Recorded on the phone</th>
                <th className="px-3 py-3">Received</th>
                <th className="px-3 py-3">Mark</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 && (
                <tr>
                  <td className="px-3 py-3" colSpan={6}>
                    No counts yet.
                  </td>
                </tr>
              )}
              {stats.map((stat) => (
                <tr key={stat.id} className="border-t border-line">
                  <td className="px-3 py-3">{formatDate(stat.feedingDate)}</td>
                  <td className="px-3 py-3">{stat.breakfastFed}</td>
                  <td className="px-3 py-3">{stat.mainMealFed}</td>
                  <td className="px-3 py-3">{formatWhen(stat.clientRecordedAt)}</td>
                  <td className="px-3 py-3">{formatWhen(stat.serverReceivedAt)}</td>
                  <td className="px-3 py-3">
                    <CountBadge mark={countMark(stat)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Monthly forms">
        <div className="grid gap-3">
          {packs.length === 0 && <p className="text-sm">No monthly confirmation yet.</p>}
          {packs.map((pack) => {
            const due = monthlyDueDate(pack.period)
            const mark = monthlyMark(pack, due, snapshot.asOf)
            return (
              <article key={pack.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-navy">{formatMonth(pack.period)}</h3>
                  <MonthlyBadge mark={mark} />
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  <li>{pack.attendanceRegisterSent ? 'Attendance register sent' : 'Attendance register not confirmed'}</li>
                  <li>{pack.stockFormSent ? 'Stock form sent' : 'Stock form not confirmed'}</li>
                  <li>{pack.proofOfPaymentSent ? 'Proof of payment sent' : 'Proof of payment not confirmed'}</li>
                </ul>
                <p className="mt-2 text-sm text-muted">
                  Recorded {formatWhen(pack.clientRecordedAt)}. Due before {formatDate(due)}.
                </p>
              </article>
            )
          })}
        </div>
      </Section>

      <Section title="Issues">
        <div className="grid gap-3">
          {issues.length === 0 && <p className="text-sm">No issues from this school.</p>}
          {issues.map((issue) => (
            <article key={issue.id} className="rounded-xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-navy">{kindLabel(issue.kind)}</p>
              <p className="mt-2 text-sm leading-relaxed">{issue.body}</p>
              <div className="mt-3">
                <IssueActions issueId={issue.id} status={issue.status} />
              </div>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}

