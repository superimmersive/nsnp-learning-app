import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { peopleAtSchool, roleLabel } from '@/officials/metrics'
import { fieldClass } from '@/officials/present'
import { apiSend } from '@/sync/client'
import { apiBase, officialToken } from '@/sync/config'
import { nowIso } from '../access'
import { approverFor, decideMembership, refreshStaffCode } from '../join'
import { usePrototype } from '../store'

export function PeoplePage() {
  const { snapshot, phone, replaceSnapshot } = usePrototype()
  const [params] = useSearchParams()
  const requested = params.get('school')
  const [schoolId, setSchoolId] = useState(
    snapshot.schools.some((school) => school.id === requested) ? requested! : 'school-90000001',
  )
  const people = peopleAtSchool(snapshot, schoolId)
  const staffCode = snapshot.staffCodes.find((item) => item.schoolId === schoolId)
  const school = snapshot.schools.find((item) => item.id === schoolId)

  function decide(membershipId: string, decision: 'active' | 'removed') {
    const token = phone.apiToken || officialToken('district_official')
    if (apiBase() && token) {
      void apiSend(`/v1/memberships/${membershipId}/decision`, { token, body: { decision } })
        .then(() => apiSend(`/v1/schools/${schoolId}/people`, { token }))
        .then((json) => {
          const remote = json as { memberships?: typeof snapshot.memberships; users?: typeof snapshot.users }
          const memberships = [
            ...snapshot.memberships.filter((item) => item.schoolId !== schoolId),
            ...(remote.memberships ?? []),
          ]
          const users = [...snapshot.users]
          for (const user of remote.users ?? []) {
            if (!users.some((item) => item.id === user.id)) users.push(user)
          }
          replaceSnapshot({ ...snapshot, memberships, users })
        })
      return
    }
    replaceSnapshot(decideMembership(snapshot, membershipId, decision, approverFor(snapshot, schoolId), nowIso()))
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">People at this school</h1>
      <p className="mt-2 text-base leading-relaxed">
        Approve or decline someone who is waiting. Their role is shown. Quiz answers are not.
      </p>
      <label className="mt-4 grid gap-1 text-sm font-semibold text-navy" htmlFor="people-school">
        School
        <select id="people-school" className={fieldClass('h-14 text-base')} value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
          {snapshot.schools.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {staffCode && (
        <div className="mt-4 rounded-xl bg-white px-4 py-4">
          <p className="text-sm text-muted">Staff code for {school?.name}</p>
          <p className="mt-1 text-2xl font-semibold tracking-wide text-navy">{staffCode.code}</p>
          <p className="mt-1 text-sm">Read this code to a food handler, SMT member, or principal.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-14 w-full"
            onClick={() => replaceSnapshot(refreshStaffCode(snapshot, schoolId, new Date().toISOString()))}
          >
            New staff code
          </Button>
        </div>
      )}
      <ul className="mt-4 grid gap-3">
        {people.length === 0 && <li className="text-base">Nobody has joined this school yet.</li>}
        {people.map((person) => (
          <li key={person.membershipId} className="rounded-xl border border-line bg-white p-4">
            <p className="text-lg font-semibold text-navy">{person.name}</p>
            <p className="text-sm">{roleLabel(person.role)}</p>
            <p className="mt-1 text-sm font-semibold">{statusLabel(person.status)}</p>
            {person.status === 'pending' && (
              <div className="mt-3 grid gap-2">
                <Button type="button" className="h-14" onClick={() => decide(person.membershipId, 'active')}>
                  Approve
                </Button>
                <Button type="button" variant="outline" className="h-14" onClick={() => decide(person.membershipId, 'removed')}>
                  Decline
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function statusLabel(status: 'pending' | 'active' | 'removed'): string {
  if (status === 'active') return 'Approved'
  if (status === 'removed') return 'Declined'
  return 'Waiting for approval'
}
