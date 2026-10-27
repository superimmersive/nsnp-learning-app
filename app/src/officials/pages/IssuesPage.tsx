import { useState } from 'react'
import { Link } from 'react-router'
import { kindLabel } from '../present'
import { IssueActions } from '../ui'
import { formatWhen } from '../time'
import { useOfficials } from '../store'
import type { IssueReport } from '../types'

type Filter = 'open' | 'seen' | 'closed' | 'all'

export function IssuesPage() {
  const { snapshot } = useOfficials()
  const [filter, setFilter] = useState<Filter>('open')
  const issues = [...snapshot.issues]
    .filter((issue) => filter === 'all' || issue.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Issues</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        Notes sent from schools. Mark seen when you have read one. Close it when it is dealt with. Counts and quiz
        answers stay as they were.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Issue status">
        {(['open', 'seen', 'closed', 'all'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`h-10 rounded-lg px-3 text-sm font-semibold ${
              filter === value ? 'bg-navy text-white' : 'border border-line bg-white text-navy'
            }`}
            onClick={() => setFilter(value)}
          >
            {filterLabel(value)}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {issues.length === 0 && <p className="text-sm">Nothing in this list.</p>}
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} schoolName={schoolName(snapshot.schools, issue.schoolId)} />
        ))}
      </div>
    </div>
  )
}

function IssueCard({ issue, schoolName: name }: { issue: IssueReport; schoolName: string }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy">{kindLabel(issue.kind)}</p>
          <p className="mt-1 text-sm">
            <Link to={`/officials/schools/${issue.schoolId}`} className="font-semibold text-blue hover:underline">
              {name}
            </Link>
            <span className="text-muted"> · {formatWhen(issue.createdAt)}</span>
          </p>
        </div>
        <p className="text-sm font-semibold capitalize">{issue.status === 'seen' ? 'Seen' : issue.status === 'open' ? 'Open' : 'Closed'}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{issue.body}</p>
      <div className="mt-3">
        <IssueActions issueId={issue.id} status={issue.status} />
      </div>
    </article>
  )
}

function schoolName(schools: { id: string; name: string }[], schoolId: string): string {
  return schools.find((school) => school.id === schoolId)?.name ?? 'Unknown school'
}

function filterLabel(filter: Filter): string {
  switch (filter) {
    case 'open':
      return 'Open'
    case 'seen':
      return 'Seen'
    case 'closed':
      return 'Closed'
    case 'all':
      return 'All'
  }
}
