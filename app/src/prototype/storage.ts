import { browserStorage } from '@/lib/progress'
import { createExampleSnapshot } from '@/officials/mockData'
import type { OfficialsSnapshot } from '@/officials/types'
import { createExamplePhone, type PhoneSession } from './phone'

/** Prototype records. Never the lesson progress key `nsnp-learning-progress-v1`. */
export const TRIAL_SNAPSHOT_KEY = 'nsnp-trial-prototype-v1'
export const PHONE_SESSION_KEY = 'nsnp-trial-phone-v1'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function prototypeStorage(): Store | null {
  return browserStorage()
}

export function loadTrialSnapshot(storage: Pick<Storage, 'getItem'> | null): OfficialsSnapshot {
  const fresh = createExampleSnapshot()
  if (!storage) return fresh
  try {
    const raw = storage.getItem(TRIAL_SNAPSHOT_KEY)
    if (!raw) return fresh
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed)) return fresh
    if (!Array.isArray(parsed.staffCodes)) return { ...parsed, staffCodes: fresh.staffCodes }
    return parsed
  } catch {
    return fresh
  }
}

export function saveTrialSnapshot(storage: Store | null, snapshot: OfficialsSnapshot) {
  try {
    storage?.setItem(TRIAL_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // A full or private browser should not crash the prototype.
  }
}

export function loadPhoneSession(storage: Pick<Storage, 'getItem'> | null, nowIso: string): PhoneSession {
  const fresh = createExamplePhone(nowIso)
  if (!storage) return fresh
  try {
    const raw = storage.getItem(PHONE_SESSION_KEY)
    if (!raw) return fresh
    const parsed: unknown = JSON.parse(raw)
    if (!isPhone(parsed)) return fresh
    return { ...fresh, ...parsed, pins: parsed.pins, continueTo: parsed.continueTo ?? null, draft: parsed.draft ?? null }
  } catch {
    return fresh
  }
}

export function savePhoneSession(storage: Store | null, phone: PhoneSession) {
  try {
    storage?.setItem(PHONE_SESSION_KEY, JSON.stringify(phone))
  } catch {
    // Ignore a failed prototype save.
  }
}

export function clearPrototypeStorage(storage: Store | null) {
  try {
    storage?.removeItem(TRIAL_SNAPSHOT_KEY)
    storage?.removeItem(PHONE_SESSION_KEY)
  } catch {
    // Ignore.
  }
}

function isSnapshot(value: unknown): value is OfficialsSnapshot {
  if (!value || typeof value !== 'object') return false
  const record = value as OfficialsSnapshot
  return Array.isArray(record.schools) && Array.isArray(record.joinCodes) && Array.isArray(record.users)
}

function isPhone(value: unknown): value is PhoneSession {
  if (!value || typeof value !== 'object') return false
  const record = value as PhoneSession
  return Array.isArray(record.pins) && (record.syncStatus === 'saved' || record.syncStatus === 'sent')
}
