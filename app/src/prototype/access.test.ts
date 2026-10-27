import { describe, expect, it } from 'vitest'
import { createExampleSnapshot } from '@/officials/mockData'
import {
  checkCoordinatorCode,
  checkPin,
  checkStaffCode,
  phonesMatch,
  pinSwitchAllowed,
} from './access'
import { claimCoordinator, claimFromDraft, claimStaff, decideMembership } from './join'
import type { JoinDraft } from './phone'

const NOW = '2026-10-27T15:00:00+02:00'

function draft(partial: Partial<JoinDraft> & Pick<JoinDraft, 'path' | 'code' | 'schoolId'>): JoinDraft {
  return {
    firstName: 'Naledi',
    surname: 'Jacobs',
    cellphone: '+27820000091',
    role: partial.path === 'coordinator' ? 'nsnp_coordinator' : 'food_handler',
    joinCodeId: null,
    agreed: true,
    continueTo: partial.path === 'coordinator' ? '/join/pin' : '/join/waiting',
    ...partial,
  }
}

describe('coordinator code', () => {
  it('accepts the recorded cellphone in local or international form', () => {
    const snapshot = createExampleSnapshot()
    expect(phonesMatch('082 000 0091', '+27820000091')).toBe(true)
    const result = checkCoordinatorCode(snapshot, 'dry4k2', '0820000091', NOW)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.school.name).toContain('Dryveld')
  })

  it('rejects a different cellphone', () => {
    const snapshot = createExampleSnapshot()
    const result = checkCoordinatorCode(snapshot, 'DRY4K2', '0820000092', NOW)
    expect(result).toEqual({ ok: false, problem: 'wrong_number' })
  })

  it('rejects a code that is past 14 days', () => {
    const snapshot = createExampleSnapshot()
    const result = checkCoordinatorCode(snapshot, 'OLD2K4', '+27820000099', NOW)
    expect(result).toEqual({ ok: false, problem: 'expired' })
    const earlier = checkCoordinatorCode(snapshot, 'OLD2K4', '+27820000099', '2026-09-30T12:00:00+02:00')
    expect(earlier.ok).toBe(true)
  })

  it('rejects a used or withdrawn code before checking the number', () => {
    const snapshot = createExampleSnapshot()
    expect(checkCoordinatorCode(snapshot, 'LANG7M3', '+27820000010', NOW)).toEqual({ ok: false, problem: 'used' })
    expect(checkCoordinatorCode(snapshot, 'WIT9Q1', '+27820000012', NOW)).toEqual({ ok: false, problem: 'withdrawn' })
    expect(checkCoordinatorCode(snapshot, 'NOCODE', '0820000091', NOW)).toEqual({ ok: false, problem: 'unknown' })
  })
})

describe('staff code and PIN', () => {
  it('accepts the school staff code and does not bind it to a cellphone', () => {
    const snapshot = createExampleSnapshot()
    const result = checkStaffCode(snapshot, 'handl2')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.school.schoolNumber).toBe('90000001')
  })

  it('accepts a 4-digit PIN and rejects easy patterns', () => {
    expect(checkPin('2580')).toBeNull()
    expect(checkPin('123')).toBe('length')
    expect(checkPin('12ab')).toBe('digits')
    expect(checkPin('1111')).toBe('easy')
    expect(checkPin('1234')).toBe('easy')
    expect(checkPin('4321')).toBe('easy')
  })

  it('allows a PIN switch for 7 days after check-in', () => {
    expect(pinSwitchAllowed('2026-10-27T15:00:00+02:00', '2026-11-03T15:00:00+02:00')).toBe(true)
    expect(pinSwitchAllowed('2026-10-27T15:00:00+02:00', '2026-11-03T15:00:00.001+02:00')).toBe(false)
    expect(pinSwitchAllowed(null, NOW)).toBe(false)
  })
})

describe('joining a school', () => {
  it('activates a coordinator and uses up the code', () => {
    const snapshot = createExampleSnapshot()
    const checked = checkCoordinatorCode(snapshot, 'DRY4K2', '+27820000091', NOW)
    if (!checked.ok) throw new Error('expected a valid code')
    const next = claimFromDraft(
      snapshot,
      draft({
        path: 'coordinator',
        code: 'DRY4K2',
        schoolId: checked.school.id,
        joinCodeId: checked.joinCode.id,
      }),
      NOW,
    )
    expect(next.joinCodes.find((item) => item.code === 'DRY4K2')?.usedAt).toBe(NOW)
    const membership = next.memberships.find((item) => item.id === 'mem-code-dryveld')
    expect(membership?.status).toBe('active')
    expect(membership?.role).toBe('nsnp_coordinator')
  })

  it('leaves other staff pending until the coordinator decides', () => {
    const snapshot = createExampleSnapshot()
    const checked = checkStaffCode(snapshot, 'HANDL2')
    if (!checked.ok) throw new Error('expected a staff code')
    const pending = claimStaff(
      snapshot,
      draft({ path: 'staff', code: 'HANDL2', schoolId: checked.school.id, role: 'food_handler', cellphone: '0825550100' }),
      NOW,
    )
    const membership = pending.memberships.find((item) => item.status === 'pending' && item.schoolId === checked.school.id && item.role === 'food_handler' && item.id.startsWith('mem-joined'))
    expect(membership).toBeTruthy()
    const approved = decideMembership(pending, membership!.id, 'active', 'mem-90000001-coord', NOW)
    expect(approved.memberships.find((item) => item.id === membership!.id)?.status).toBe('active')
    const declined = decideMembership(pending, membership!.id, 'removed', 'mem-90000001-coord', NOW)
    expect(declined.memberships.find((item) => item.id === membership!.id)?.status).toBe('removed')
  })

  it('does not claim a coordinator code that failed validation', () => {
    const snapshot = createExampleSnapshot()
    const next = claimCoordinator(
      snapshot,
      draft({ path: 'coordinator', code: 'DRY4K2', schoolId: 'school-90000009', joinCodeId: 'missing' }),
      NOW,
    )
    expect(next).toBe(snapshot)
  })
})
