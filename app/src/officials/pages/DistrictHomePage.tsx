import { useState } from 'react'
import { Link } from 'react-router'
import { schoolRows, trialMetrics, toneLabel, type SchoolRow, type SchoolTone } from '../metrics'
import { useOfficials } from '../store'
import { MetricCard, MonthlyBadge, ToneBadge } from '../ui'

type SortKey = 'name' | 'schoolNumber' | 'tone' | 'coordinator' | 'coordinatorPassed' | 'latestMark' | 'monthly' | 'openIssues'

const TONE_RANK: Record<SchoolTone, number> = { red: 0, amber: 1, green: 2 }

export function DistrictHomePage() {
  const { snapshot } = useOfficials()
  const metrics = trialMetrics(snapshot)
  const rows = schoolRows(snapshot)
  const [query, setQuery] = useState('')
  const [tone, setTone] = useState<SchoolTone | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('tone')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const needsLook = rows.filter((row) => row.tone === 'red')

  const needle = query.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    const matchesTone = tone === 'all' || row.tone === tone
    const matchesQuery =
      needle.length === 0 || row.name.toLowerCase().includes(needle) || row.schoolNumber.includes(needle)
    return matchesTone && matchesQuery
  })
  const sorted = [...filtered].sort((a, b) => compareRows(a, b, sortKey))
  const visible = direction === 'asc' ? sorted : sorted.reverse()

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setDirection('asc')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Eden and Central Karoo</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink">
        Proof metrics for the trial list. A school is active when a coordinator is approved and someone has synced in
        the last 7 days. On time means the phone recorded the count before 13:30. Monthly forms are for October, due
        before 7 November.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Active schools"
          value={`${metrics.activeSchools} of ${metrics.schoolCount}`}
          detail={`${metrics.activePercent}% of the trial list`}
        />
        <MetricCard
          label="Lessons and quizzes"
          value={`${metrics.lessonsPercent}%`}
          detail={`${metrics.lessonsPassed} of ${metrics.lessonsPossible} modules passed`}
        />
        <MetricCard
          label="Certificates"
          value={String(metrics.certificates)}
          detail="Learning records, not official WCED certificates"
        />
        <MetricCard
          label="On-time daily stats"
          value={metrics.onTimePercent == null ? '—' : `${metrics.onTimePercent}%`}
          detail={`${metrics.onTimeCount} of ${metrics.submittedCounts} counts before 13:30`}
        />
        <MetricCard
          label="Monthly forms confirmed"
          value={`${metrics.monthlyConfirmed} of ${metrics.schoolCount}`}
          detail={`${metrics.monthlyPercent}% confirmed before the 7th`}
        />
        <MetricCard
          label="Open issues"
          value={String(metrics.openIssues)}
          detail="Not yet marked seen"
          href="/officials/issues"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-navy">Needs a look</h2>
        {needsLook.length === 0 ? (
          <p className="mt-2 text-sm text-ink">No school is marked needs a look.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {needsLook.map((row) => (
              <li key={row.schoolId}>
                <Link
                  to={`/officials/schools/${row.schoolId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-blue"
                >
                  <span>
                    <span className="block font-semibold text-navy">{row.name}</span>
                    <span className="text-sm text-muted">EMIS {row.schoolNumber}</span>
                  </span>
                  <ToneBadge tone={row.tone} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Trial schools</h2>
          <p className="text-sm text-muted">{visible.length} shown</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="h-12 min-w-48 flex-1 rounded-lg border border-line bg-white px-3 text-base"
            placeholder="Search name or EMIS"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search schools"
          />
          {(['all', 'red', 'amber', 'green'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`h-12 rounded-lg px-3 text-sm font-semibold ${
                tone === option ? 'bg-navy text-white' : 'border border-line bg-white text-navy'
              }`}
              onClick={() => setTone(option)}
            >
              {option === 'all' ? 'All' : toneLabel(option)}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-sm font-semibold text-navy sm:hidden" htmlFor="school-sort">
          Sort
          <select
            id="school-sort"
            className="mt-1 block h-12 w-full rounded-lg border border-line bg-white px-3 text-base font-normal"
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value as SortKey)
              setDirection('asc')
            }}
          >
            <option value="tone">Status</option>
            <option value="name">School name</option>
            <option value="schoolNumber">EMIS</option>
            <option value="coordinator">Coordinator</option>
            <option value="coordinatorPassed">Modules passed</option>
            <option value="latestMark">Latest count</option>
            <option value="monthly">Monthly forms</option>
            <option value="openIssues">Issues</option>
          </select>
        </label>
        <ul className="mt-3 grid gap-2 sm:hidden">
          {visible.map((row) => (
            <li key={row.schoolId}>
              <Link to={`/officials/schools/${row.schoolId}`} className="block rounded-xl border border-line bg-white p-3">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy">{row.name}</span>
                    <span className="text-sm text-muted">EMIS {row.schoolNumber}</span>
                  </span>
                  <ToneBadge tone={row.tone} />
                </span>
                <span className="mt-2 block text-sm">
                  {row.coordinator}
                  {' · '}
                  {row.hasApprovedCoordinator ? `${row.coordinatorPassed} of 11 passed` : 'No modules passed'}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span>{row.latestMainMeal == null ? 'No count today' : `${row.latestMainMeal} fed today`}</span>
                  <MonthlyBadge mark={row.monthly} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white sm:block">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="bg-paper text-navy">
              <tr>
                <SortHeader label="School" sortKey="name" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="EMIS" sortKey="schoolNumber" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="Status" sortKey="tone" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="Coordinator" sortKey="coordinator" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="Modules" sortKey="coordinatorPassed" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="Latest count" sortKey="latestMark" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="Monthly forms" sortKey="monthly" active={sortKey} direction={direction} onSort={sortBy} />
                <SortHeader label="Issues" sortKey="openIssues" active={sortKey} direction={direction} onSort={sortBy} />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.schoolId} className="border-t border-line">
                  <td className="sticky left-0 bg-white px-3 py-3">
                    <Link to={`/officials/schools/${row.schoolId}`} className="font-semibold text-blue hover:underline">
                      {row.name}
                    </Link>
                    <span className="block text-muted">{row.phase}</span>
                  </td>
                  <td className="px-3 py-3 font-mono">{row.schoolNumber}</td>
                  <td className="px-3 py-3">
                    <ToneBadge tone={row.tone} />
                  </td>
                  <td className="px-3 py-3">{row.coordinator}</td>
                  <td className="px-3 py-3">{row.hasApprovedCoordinator ? `${row.coordinatorPassed} of 11` : '—'}</td>
                  <td className="px-3 py-3">
                    {row.latestMainMeal == null ? 'No count' : row.latestMainMeal}
                    {row.aboveEnrolment ? <span className="block text-gold">Above enrolment</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    <MonthlyBadge mark={row.monthly} />
                  </td>
                  <td className="px-3 py-3">{row.openIssues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function compareRows(a: SchoolRow, b: SchoolRow, key: SortKey): number {
  if (key === 'tone') return TONE_RANK[a.tone] - TONE_RANK[b.tone] || a.name.localeCompare(b.name)
  if (key === 'coordinatorPassed' || key === 'openIssues') return a[key] - b[key]
  return String(a[key]).localeCompare(String(b[key]))
}

function SortHeader({
  label,
  sortKey,
  active,
  direction,
  onSort,
}: {
  label: string
  sortKey: SortKey
  active: SortKey
  direction: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  const selected = active === sortKey
  return (
    <th className="px-3 py-3 font-semibold" aria-sort={selected ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="inline-flex h-10 items-center gap-1" onClick={() => onSort(sortKey)}>
        {label}
        <span className="text-muted" aria-hidden="true">
          {selected ? (direction === 'asc' ? '↑' : '↓') : ''}
        </span>
      </button>
    </th>
  )
}
