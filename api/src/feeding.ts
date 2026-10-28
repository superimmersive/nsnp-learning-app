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

function shiftDays(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + delta))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

function isWeekend(isoDate: string): boolean {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 || weekday === 6
}

export function expectedFeedingDay(asOfIso: string): string {
  const { date, minutes } = johannesburgParts(asOfIso)
  if (!isWeekend(date) && minutes >= DEADLINE_MINUTES) return date
  let cursor = shiftDays(date, -1)
  while (isWeekend(cursor)) cursor = shiftDays(cursor, -1)
  return cursor
}

export function feedingPeriod(asOfIso: string): string {
  const { date } = johannesburgParts(asOfIso)
  const [year, month, day] = date.split('-').map(Number)
  let viewYear = year
  let viewMonth = day <= 7 ? month - 1 : month
  if (viewMonth === 0) {
    viewMonth = 12
    viewYear -= 1
  }
  return `${viewYear}-${String(viewMonth).padStart(2, '0')}`
}

export function clockIsPlausible(clientIso: string, serverIso: string): boolean {
  return Math.abs(new Date(clientIso).getTime() - new Date(serverIso).getTime()) <= 10 * 60 * 1000
}
