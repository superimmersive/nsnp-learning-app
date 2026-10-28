import { countMarkLabel, monthlyMarkLabel, schoolRows, toneLabel } from './metrics'
import type { OfficialsSnapshot } from './types'

const HEADERS = [
  'school_number',
  'name',
  'phase',
  'coordinator',
  'coordinator_modules_passed',
  'modules_passed',
  'certificates',
  'latest_main_meal',
  'latest_count',
  'monthly_forms',
  'open_issues',
  'status',
  'active',
]

function cell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function trialListCsv(snapshot: OfficialsSnapshot): string {
  const lines = [HEADERS.join(',')]
  for (const row of schoolRows(snapshot)) {
    lines.push(
      [
        row.schoolNumber,
        row.name,
        row.phase,
        row.coordinator,
        `${row.coordinatorPassed} of 11`,
        row.modulesPassed,
        row.certificates,
        row.latestMainMeal ?? '',
        countMarkLabel(row.latestMark),
        monthlyMarkLabel(row.monthly),
        row.openIssues,
        toneLabel(row.tone),
        row.active ? 'Yes' : 'No',
      ]
        .map(cell)
        .join(','),
    )
  }
  return `\uFEFF${lines.join('\n')}\n`
}
