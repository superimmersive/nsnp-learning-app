import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { usePrototype } from '../store'

export function WaitingPage() {
  const { snapshot, phone } = usePrototype()
  const membership = snapshot.memberships.find((item) => item.userId === phone.activeUserId && item.scope === 'school')
  const user = snapshot.users.find((item) => item.id === phone.activeUserId)
  const school = snapshot.schools.find((item) => item.id === membership?.schoolId)
  const showPerson = phone.continueTo === '/join/waiting' || membership?.status === 'pending'
  const approved = showPerson && membership?.status === 'active'

  return (
    <div>
      <h1 className="text-2xl font-semibold leading-tight text-navy">The coordinator still needs to approve you.</h1>
      <p className="mt-3 text-base leading-relaxed">
        You can keep reading the lessons. Nothing from this phone is sent to the district until you are approved.
      </p>
      {showPerson && user && (
        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-base">
          <span className="font-semibold">
            {user.firstName} {user.surname}
          </span>
          {school ? ` at ${school.name}` : ''}. {approved ? 'You are approved.' : 'Waiting for approval.'}
        </p>
      )}
      <div className="mt-5 grid gap-3">
        <Button asChild className="h-14 text-lg">
          <Link to="/">Open the lessons</Link>
        </Button>
        {approved && (
          <Button asChild variant="secondary" className="h-14 text-lg">
            <Link to="/join/pin">Set a PIN</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="h-14 text-lg">
          <Link to={membership ? `/join/people?school=${membership.schoolId}` : '/join/people'}>
            Review people at this school
          </Link>
        </Button>
      </div>
    </div>
  )
}
