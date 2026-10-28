/** Example clock for the prototype. Counts due after 13:30 are already due. */
export const EXAMPLE_AS_OF = '2026-10-27T15:00:00+02:00'

const DEADLINE_MINUTES = 13 * 60 + 30

export function johannesburgParts(iso: string): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

export function weekdayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function isWeekend(isoDate: string): boolean {
  const day = weekdayIndex(isoDate)
  return day === 0 || day === 6
}

export function shiftDays(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + delta))
  const y = next.getUTCFullYear()
  const m = String(next.getUTCMonth() + 1).padStart(2, '0')
  const d = String(next.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function previousWeekday(isoDate: string): string {
  let cursor = shiftDays(isoDate, -1)
  while (isWeekend(cursor)) cursor = shiftDays(cursor, -1)
  return cursor
}

/** The feeding day a count should already exist for, at this clock. */
export function expectedFeedingDay(asOfIso: string): string | null {
  const { date, minutes } = johannesburgParts(asOfIso)
  if (!isWeekend(date) && minutes >= DEADLINE_MINUTES) return date
  const previous = previousWeekday(date)
  return previous
}

export function recentFeedingDays(asOfIso: string, count = 5): string[] {
  const expected = expectedFeedingDay(asOfIso)
  if (!expected) return []
  const days: string[] = []
  let cursor = expected
  while (days.length < count) {
    if (!isWeekend(cursor)) days.push(cursor)
    cursor = shiftDays(cursor, -1)
  }
  return days
}

export function addDaysIso(iso: string, days: number): string {
  const { date } = johannesburgParts(iso)
  const shifted = shiftDays(date, days)
  return `${shifted}T15:00:00+02:00`
}

/** Before the 7th of the next month. The 7th itself is late. */
export function monthlyDueDate(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-07`
}

/**
 * On the 7th and earlier, the pack still in view is last month's.
 * After the 7th, the pack in view is this month's, due next month.
 */
export function feedingPeriod(asOfIso: string): { period: string; due: string } {
  const { date } = johannesburgParts(asOfIso)
  const [year, month, day] = date.split('-').map(Number)
  let viewYear = year
  let viewMonth = day <= 7 ? month - 1 : month
  if (viewMonth === 0) {
    viewMonth = 12
    viewYear -= 1
  }
  const period = `${viewYear}-${String(viewMonth).padStart(2, '0')}`
  return { period, due: monthlyDueDate(period) }
}

export function dateInRange(iso: string, fromDate: string, toDate: string): boolean {
  const { date } = johannesburgParts(iso)
  return date >= fromDate && date <= toDate
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** `2026-10` becomes `October 2026`. */
export function formatMonth(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period
  const name = MONTHS[Number(match[2]) - 1]
  if (!name) return period
  return `${name} ${match[1]}`
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatClockLabel(asOfIso: string): string {
  return `${formatWhen(asOfIso)} SAST`
}
