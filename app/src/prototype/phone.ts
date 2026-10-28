export type JoinPath = 'coordinator' | 'staff'

export type StaffJoinRole = 'food_handler' | 'smt_member' | 'principal'

export type JoinDraft = {
  path: JoinPath
  code: string
  firstName: string
  surname: string
  cellphone: string
  role: StaffJoinRole | 'nsnp_coordinator'
  schoolId: string
  joinCodeId: string | null
  agreed: boolean
  continueTo: '/join/pin' | '/join/waiting'
}

export type PhoneSession = {
  usedAtSchoolId: string | null
  lastCheckInAt: string | null
  pins: { userId: string; pin: string }[]
  activeUserId: string | null
  syncStatus: 'saved' | 'sent'
  existingProgressChoice: 'yes' | 'no' | null
  continueTo: '/join/pin' | '/join/waiting' | null
  draft: JoinDraft | null
}

/** PINs already on the shared kitchen phone in the example. They are not account passwords. */
export const EXAMPLE_PHONE_PINS = [
  { userId: 'user-90000001-coord', name: 'Thandi Maseko', pin: '2580' },
  { userId: 'user-90000001-fh', name: 'Lindi Ndlovu', pin: '4691' },
] as const

export function createExamplePhone(nowIso: string): PhoneSession {
  return {
    usedAtSchoolId: 'school-90000001',
    lastCheckInAt: nowIso,
    pins: EXAMPLE_PHONE_PINS.map((item) => ({ userId: item.userId, pin: item.pin })),
    activeUserId: 'user-90000001-coord',
    syncStatus: 'saved',
    existingProgressChoice: null,
    continueTo: null,
    draft: null,
  }
}
