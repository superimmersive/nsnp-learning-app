import { content } from '@/lib/content'
import type { DailyFeedingStat, MonthlyPack, OfficialsSnapshot, SchoolRole } from './types'
import { dateInRange, expectedFeedingDay, feedingPeriod, johannesburgParts, recentFeedingDays, shiftDays } from './time'

export const MODULES = content.modules.map((module) => ({
  id: module.id,
  number: module.number,
  title: module.title,
}))

export const MODULE_COUNT = MODULES.length

const ROLE_ORDER: SchoolRole[] = ['nsnp_coordinator', 'principal', 'smt_member', 'food_handler']

export function roleLabel(role: string): string {
  switch (role) {
    case 'nsnp_coordinator':
      return 'NSNP coordinator'
    case 'principal':
      return 'Principal'
    case 'smt_member':
      return 'SMT member'
    case 'food_handler':
      return 'Food handler'
    case 'district_official':
      return 'District official'
    case 'super_admin':
      return 'Super-admin'
    default:
      return role
  }
}

export function isOnTimeStat(stat: Pick<DailyFeedingStat, 'feedingDate' | 'clientRecordedAt' | 'clockPlausible'>): boolean {
  if (!stat.clockPlausible) return false
  const recorded = johannesburgParts(stat.clientRecordedAt)
  return recorded.date === stat.feedingDate && recorded.minutes < 13 * 60 + 30
}

export function acceptedStats(stats: DailyFeedingStat[]): DailyFeedingStat[] {
  const replaced = new Set(stats.map((stat) => stat.replacesId).filter((id): id is string => Boolean(id)))
  return stats.filter((stat) => !replaced.has(stat.id))
}

export function onTimePercent(stats: DailyFeedingStat[]): number | null {
  const rows = acceptedStats(stats)
  if (rows.length === 0) return null
  const onTime = rows.filter((stat) => isOnTimeStat(stat)).length
  return Math.round((onTime / rows.length) * 100)
}

export type CountMark = 'on_time' | 'late' | 'check_time' | 'missing'

export function countMark(stat: DailyFeedingStat | undefined): CountMark {
  if (!stat) return 'missing'
  if (!stat.clockPlausible) return 'check_time'
  return isOnTimeStat(stat) ? 'on_time' : 'late'
}

export function countMarkLabel(mark: CountMark): string {
  switch (mark) {
    case 'on_time':
      return 'On time'
    case 'late':
      return 'Late'
    case 'check_time':
      return 'Check the time'
    case 'missing':
      return 'No count'
  }
}

export type MonthlyMark = 'confirmed' | 'late' | 'not_yet'

export function monthlyMark(pack: MonthlyPack | undefined, dueDate: string, asOfIso: string): MonthlyMark {
  const asOfDate = johannesburgParts(asOfIso).date
  const deadlinePassed = asOfDate >= dueDate
  if (!pack || !pack.attendanceRegisterSent || !pack.stockFormSent || !pack.proofOfPaymentSent) {
    return deadlinePassed ? 'late' : 'not_yet'
  }
  const recorded = johannesburgParts(pack.clientRecordedAt).date
  return recorded < dueDate ? 'confirmed' : 'late'
}

export function monthlyMarkLabel(mark: MonthlyMark): string {
  switch (mark) {
    case 'confirmed':
      return 'Confirmed before the 7th'
    case 'late':
      return 'Late'
    case 'not_yet':
      return 'Not confirmed yet'
  }
}

export type SchoolTone = 'red' | 'amber' | 'green'

export function schoolTone(input: {
  hasApprovedCoordinator: boolean
  openIssues: number
  seenIssues: number
  latestMark: CountMark
  monthly: MonthlyMark
  syncedRecently: boolean
}): SchoolTone {
  if (!input.hasApprovedCoordinator || input.openIssues > 0 || input.latestMark === 'missing' || input.monthly === 'late') {
    return 'red'
  }
  if (
    input.latestMark === 'late' ||
    input.latestMark === 'check_time' ||
    input.monthly === 'not_yet' ||
    input.seenIssues > 0 ||
    !input.syncedRecently
  ) {
    return 'amber'
  }
  return 'green'
}

export function toneLabel(tone: SchoolTone): string {
  switch (tone) {
    case 'red':
      return 'Needs a look'
    case 'amber':
      return 'Check'
    case 'green':
      return 'On track'
  }
}

export type PersonProgress = {
  userId: string
  membershipId: string
  name: string
  role: SchoolRole
  status: 'pending' | 'active' | 'removed'
  passed: number
  moduleIds: string[]
}

export type SchoolRow = {
  schoolId: string
  schoolNumber: string
  name: string
  phase: string
  quintile: number | null
  enrolment: number | null
  coordinator: string
  hasApprovedCoordinator: boolean
  coordinatorPassed: number
  modulesPassed: number
  certificates: number
  latestMainMeal: number | null
  latestBreakfast: number | null
  latestMark: CountMark
  latestClientAt: string | null
  latestServerAt: string | null
  monthly: MonthlyMark
  openIssues: number
  seenIssues: number
  tone: SchoolTone
  active: boolean
  aboveEnrolment: boolean
}

function fullName(first: string, surname: string): string {
  return `${first} ${surname}`
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'primary':
      return 'Primary'
    case 'secondary':
      return 'Secondary'
    case 'combined':
      return 'Combined'
    case 'special':
      return 'Special school'
    default:
      return phase
  }
}

export function lessonCompletion(passed: number, people: number): { passed: number; possible: number; percent: number } {
  const possible = people * MODULE_COUNT
  if (possible === 0) return { passed: 0, possible: 0, percent: 0 }
  return { passed, possible, percent: Math.round((passed / possible) * 100) }
}

export function schoolRows(snapshot: OfficialsSnapshot): SchoolRow[] {
  const { period, due } = feedingPeriod(snapshot.asOf)
  const expected = expectedFeedingDay(snapshot.asOf)
  const windowStart = shiftDays(johannesburgParts(snapshot.asOf).date, -6)
  const windowEnd = johannesburgParts(snapshot.asOf).date
  const stats = acceptedStats(snapshot.dailyStats)

  return snapshot.schools
    .filter((school) => school.districtId === snapshot.district.id && school.active)
    .map((school) => {
      const memberships = snapshot.memberships.filter((membership) => membership.schoolId === school.id)
      const activeStaff = memberships.filter((membership) => membership.scope === 'school' && membership.status === 'active')
      const people = activeStaff.map((membership) => {
        const user = snapshot.users.find((item) => item.id === membership.userId)
        const progress = snapshot.moduleProgress.filter((item) => item.userId === membership.userId && item.passed)
        return {
          membership,
          user,
          passed: progress.length,
        }
      })
      const coordinatorMembership = people.find((person) => person.membership.role === 'nsnp_coordinator')
      const pendingCoordinator = memberships.find(
        (membership) => membership.role === 'nsnp_coordinator' && membership.status === 'pending',
      )
      const coordinator = coordinatorMembership?.user
        ? fullName(coordinatorMembership.user.firstName, coordinatorMembership.user.surname)
        : pendingCoordinator
          ? 'Waiting for approval'
          : 'No coordinator yet'
      const modulesPassed = people.reduce((sum, person) => sum + person.passed, 0)
      const schoolStats = stats.filter((stat) => stat.schoolId === school.id)
      const latest = expected ? schoolStats.find((stat) => stat.feedingDate === expected) : undefined
      const pack = snapshot.monthlyPacks.find(
        (item) => item.schoolId === school.id && item.period === period && !item.replacesId,
      )
      const issues = snapshot.issues.filter((issue) => issue.schoolId === school.id)
      const openIssues = issues.filter((issue) => issue.status === 'open').length
      const seenIssues = issues.filter((issue) => issue.status === 'seen').length
      const syncedRecently =
        snapshot.moduleProgress.some(
          (item) =>
            activeStaff.some((membership) => membership.userId === item.userId) &&
            dateInRange(item.updatedAt, windowStart, windowEnd),
        ) || schoolStats.some((stat) => dateInRange(stat.serverReceivedAt, windowStart, windowEnd))
      const monthly = monthlyMark(pack, due, snapshot.asOf)
      const latestMark = countMark(latest)
      const hasApprovedCoordinator = Boolean(coordinatorMembership)
      const active = hasApprovedCoordinator && syncedRecently
      const tone = schoolTone({
        hasApprovedCoordinator,
        openIssues,
        seenIssues,
        latestMark,
        monthly,
        syncedRecently,
      })
      return {
        schoolId: school.id,
        schoolNumber: school.schoolNumber,
        name: school.name,
        phase: phaseLabel(school.phase ?? ''),
        quintile: school.quintile,
        enrolment: school.enrolment,
        coordinator,
        hasApprovedCoordinator,
        coordinatorPassed: coordinatorMembership?.passed ?? 0,
        modulesPassed,
        certificates: snapshot.certificates.filter((certificate) => certificate.schoolId === school.id).length,
        latestMainMeal: latest?.mainMealFed ?? null,
        latestBreakfast: latest?.breakfastFed ?? null,
        latestMark,
        latestClientAt: latest?.clientRecordedAt ?? null,
        latestServerAt: latest?.serverReceivedAt ?? null,
        monthly,
        openIssues,
        seenIssues,
        tone,
        active,
        aboveEnrolment: Boolean(latest && school.enrolment != null && latest.mainMealFed > school.enrolment),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type TrialMetrics = {
  schoolCount: number
  activeSchools: number
  activePercent: number
  lessonsPassed: number
  lessonsPossible: number
  lessonsPercent: number
  certificates: number
  onTimeCount: number
  submittedCounts: number
  onTimePercent: number | null
  monthlyConfirmed: number
  monthlyPercent: number
  openIssues: number
  period: string
  due: string
  expectedFeedingDay: string | null
}

export function trialMetrics(snapshot: OfficialsSnapshot): TrialMetrics {
  const rows = schoolRows(snapshot)
  const lessons = lessonCompletion(
    rows.reduce((sum, row) => sum + row.modulesPassed, 0),
    snapshot.memberships.filter((membership) => membership.scope === 'school' && membership.status === 'active').length,
  )
  const days = new Set(recentFeedingDays(snapshot.asOf))
  const windowStats = acceptedStats(snapshot.dailyStats).filter((stat) => days.has(stat.feedingDate))
  const onTimeCount = windowStats.filter((stat) => isOnTimeStat(stat)).length
  const { period, due } = feedingPeriod(snapshot.asOf)
  const monthlyConfirmed = rows.filter((row) => row.monthly === 'confirmed').length
  const activeSchools = rows.filter((row) => row.active).length
  return {
    schoolCount: rows.length,
    activeSchools,
    activePercent: rows.length === 0 ? 0 : Math.round((activeSchools / rows.length) * 100),
    lessonsPassed: lessons.passed,
    lessonsPossible: lessons.possible,
    lessonsPercent: lessons.percent,
    certificates: snapshot.certificates.length,
    onTimeCount,
    submittedCounts: windowStats.length,
    onTimePercent: onTimePercent(windowStats),
    monthlyConfirmed,
    monthlyPercent: rows.length === 0 ? 0 : Math.round((monthlyConfirmed / rows.length) * 100),
    openIssues: snapshot.issues.filter((issue) => issue.status === 'open').length,
    period,
    due,
    expectedFeedingDay: expectedFeedingDay(snapshot.asOf),
  }
}

export function peopleAtSchool(snapshot: OfficialsSnapshot, schoolId: string): PersonProgress[] {
  return snapshot.memberships
    .filter((membership) => membership.schoolId === schoolId && membership.scope === 'school')
    .map((membership) => {
      const user = snapshot.users.find((item) => item.id === membership.userId)
      const progress = snapshot.moduleProgress.filter((item) => item.userId === membership.userId && item.passed)
      return {
        userId: membership.userId,
        membershipId: membership.id,
        name: user ? fullName(user.firstName, user.surname) : 'Unknown',
        role: membership.role as SchoolRole,
        status: membership.status,
        passed: progress.length,
        moduleIds: progress.map((item) => item.moduleId),
      }
    })
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name))
}

export function actorName(snapshot: OfficialsSnapshot, membershipId: string): string {
  const membership = snapshot.memberships.find((item) => item.id === membershipId)
  if (!membership) return 'Unknown person'
  const user = snapshot.users.find((item) => item.id === membership.userId)
  if (!user) return roleLabel(membership.role)
  return `${user.firstName} ${user.surname}`
}

export function maskPhone(cellphone: string): string {
  const digits = cellphone.replace(/\D/g, '')
  const last = digits.slice(-4)
  return `ending ${last}`
}
