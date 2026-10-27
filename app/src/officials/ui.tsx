import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { countMarkLabel, monthlyMarkLabel, toneLabel, type CountMark, type MonthlyMark, type SchoolTone } from './metrics'
import { toneClass } from './present'
import { useOfficials } from './store'

export function ToneBadge({ tone }: { tone: SchoolTone }) {
  return <Badge className={toneClass(tone)}>{toneLabel(tone)}</Badge>
}

export function CountBadge({ mark }: { mark: CountMark }) {
  const tone: SchoolTone = mark === 'on_time' ? 'green' : mark === 'missing' ? 'red' : 'amber'
  return <Badge className={toneClass(tone)}>{countMarkLabel(mark)}</Badge>
}

export function MonthlyBadge({ mark }: { mark: MonthlyMark }) {
  const tone: SchoolTone = mark === 'confirmed' ? 'green' : mark === 'late' ? 'red' : 'amber'
  return <Badge className={toneClass(tone)}>{monthlyMarkLabel(mark)}</Badge>
}

export function MetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string
  value: string
  detail: string
  href?: string
}) {
  const body = (
    <>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-navy">{value}</p>
      <p className="mt-1 text-sm text-ink">{detail}</p>
    </>
  )
  if (!href) {
    return <div className="rounded-xl border border-line bg-white p-4">{body}</div>
  }
  return (
    <Link to={href} className="rounded-xl border border-line bg-white p-4 hover:border-blue">
      {body}
    </Link>
  )
}

export function IssueActions({ issueId, status }: { issueId: string; status: 'open' | 'seen' | 'closed' }) {
  const { dispatch } = useOfficials()
  if (status === 'closed') return <span className="text-sm text-muted">Closed</span>
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'open' && (
        <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'mark_seen', issueId })}>
          Mark seen
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'close_issue', issueId })}>
        Close
      </Button>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function SuperOnly({ title, children }: { title: string; children: ReactNode }) {
  const { viewingAs } = useOfficials()
  if (viewingAs !== 'super_admin') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-navy">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed">
          This page is for the Superimmersive admin. Switch Viewing as to Super-admin to open it.
        </p>
      </div>
    )
  }
  return children
}
