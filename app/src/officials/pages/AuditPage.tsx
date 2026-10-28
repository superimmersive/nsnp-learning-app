import { actorName } from '../metrics'
import { useOfficials } from '../store'
import { formatWhen } from '../time'
import { SuperOnly } from '../ui'

export function AuditPage() {
  const { snapshot } = useOfficials()
  return (
    <SuperOnly title="Audit log">
      <h1 className="text-2xl font-semibold text-navy">Audit log</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        Example record of who changed a code, closed an issue, or opened a school. A reason is required when a
        super-admin opens a school. Feeding counts are not edited from this dashboard.
      </p>
      <ul className="mt-4 grid gap-2 sm:hidden">
        {snapshot.auditEvents.map((event) => (
          <li key={event.id} className="rounded-xl border border-line bg-white p-3 text-sm">
            <p className="font-semibold text-navy">{formatWhen(event.at)}</p>
            <p className="mt-1">{actorName(snapshot, event.actorMembershipId)}</p>
            <p className="mt-1">{event.summary}</p>
            {event.reason && <p className="mt-1">Reason: {event.reason}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-white sm:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-paper text-navy">
            <tr>
              <th className="px-3 py-3">When</th>
              <th className="px-3 py-3">Who</th>
              <th className="px-3 py-3">What happened</th>
              <th className="px-3 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.auditEvents.map((event) => (
              <tr key={event.id} className="border-t border-line align-top">
                <td className="px-3 py-3 whitespace-nowrap">{formatWhen(event.at)}</td>
                <td className="px-3 py-3">{actorName(snapshot, event.actorMembershipId)}</td>
                <td className="px-3 py-3">{event.summary}</td>
                <td className="px-3 py-3">{event.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SuperOnly>
  )
}
