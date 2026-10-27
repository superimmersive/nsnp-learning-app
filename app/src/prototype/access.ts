import type { JoinCode, OfficialsSnapshot, School, StaffCode } from '@/officials/types'

export const DEMO_SMS_CODE = '123456'

export function nowIso(): string {
  return new Date().toISOString()
}
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export type CodeProblem = 'unknown' | 'withdrawn' | 'used' | 'expired' | 'wrong_number'

export type PinProblem = 'length' | 'digits' | 'easy'

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Match 082… with +2782… by the last 9 digits. */
export function phonesMatch(left: string, right: string): boolean {
  const a = phoneDigits(left)
  const b = phoneDigits(right)
  if (a.length < 9 || b.length < 9) return false
  return a.slice(-9) === b.slice(-9)
}

export function checkCoordinatorCode(
  snapshot: OfficialsSnapshot,
  rawCode: string,
  cellphone: string,
  nowIso: string,
): { ok: true; joinCode: JoinCode; school: School } | { ok: false; problem: CodeProblem } {
  const code = normalizeCode(rawCode)
  const joinCode = snapshot.joinCodes.find((item) => item.code === code)
  if (!joinCode) return { ok: false, problem: 'unknown' }
  if (joinCode.withdrawnAt) return { ok: false, problem: 'withdrawn' }
  if (joinCode.usedAt) return { ok: false, problem: 'used' }
  if (new Date(joinCode.expiresAt).getTime() <= new Date(nowIso).getTime()) return { ok: false, problem: 'expired' }
  if (!phonesMatch(cellphone, joinCode.cellphone)) return { ok: false, problem: 'wrong_number' }
  const school = snapshot.schools.find((item) => item.id === joinCode.schoolId)
  if (!school) return { ok: false, problem: 'unknown' }
  return { ok: true, joinCode, school }
}

export function checkStaffCode(
  snapshot: OfficialsSnapshot,
  rawCode: string,
): { ok: true; staffCode: StaffCode; school: School } | { ok: false; problem: 'unknown' } {
  const code = normalizeCode(rawCode)
  const staffCode = snapshot.staffCodes.find((item) => item.code === code)
  if (!staffCode) return { ok: false, problem: 'unknown' }
  const school = snapshot.schools.find((item) => item.id === staffCode.schoolId)
  if (!school) return { ok: false, problem: 'unknown' }
  return { ok: true, staffCode, school }
}

export function checkSmsCode(typed: string): boolean {
  return typed.trim() === DEMO_SMS_CODE
}

/**
 * A phone PIN is 4 digits, and not an obvious pattern.
 * It only switches person on this phone. It does not sign in on a new phone.
 */
export function checkPin(pin: string): PinProblem | null {
  if (pin.length !== 4) return 'length'
  if (!/^\d{4}$/.test(pin)) return 'digits'
  if (new Set(pin).size === 1) return 'easy'
  const nums = [...pin].map(Number)
  const steps = nums.slice(1).map((value, index) => value - nums[index])
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) return 'easy'
  return null
}

export function pinProblemText(problem: PinProblem): string {
  switch (problem) {
    case 'length':
      return 'Enter 4 digits.'
    case 'digits':
      return 'Use digits only.'
    case 'easy':
      return 'Choose a PIN that is not four of the same digit, and not 1234 or 4321.'
  }
}

export function codeProblemText(problem: CodeProblem, path: 'coordinator' | 'staff'): string {
  switch (problem) {
    case 'unknown':
      return path === 'staff'
        ? 'That staff code is not on the trial list. Ask the coordinator for the current code.'
        : 'That code is not on the trial list.'
    case 'withdrawn':
      return 'This code was withdrawn. Ask the district official for a new one.'
    case 'used':
      return 'This code has already been used.'
    case 'expired':
      return 'This code has expired. A coordinator code lasts 14 days. Ask the district official for a new one.'
    case 'wrong_number':
      return 'This code only works with the cellphone the district official recorded. The number you typed is different.'
  }
}

/** The PIN may switch person offline only for 7 days after the last check-in. */
export function pinSwitchAllowed(lastCheckInAt: string | null, nowIso: string): boolean {
  if (!lastCheckInAt) return false
  return new Date(nowIso).getTime() - new Date(lastCheckInAt).getTime() <= SEVEN_DAYS_MS
}
