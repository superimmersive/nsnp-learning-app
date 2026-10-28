import { browserStorage } from '@/lib/progress'

export const OFFICIAL_SESSION_KEY = 'nsnp-official-session-v1'

export type OfficialSession = {
  token: string
  userId: string
  membershipId: string
  role: string
  deviceId: string
}

export function isDashboardRole(role: string | null | undefined): role is 'district_official' | 'super_admin' {
  return role === 'district_official' || role === 'super_admin'
}

/** Example data (no API URL) keeps the prototype nav. The live site waits for a signed-in official. */
export function showOfficialsNav(remote: boolean, role: string | null | undefined): boolean {
  if (!remote) return true
  return isDashboardRole(role)
}

export function loadOfficialSession(storage: Pick<Storage, 'getItem'> | null = browserStorage()): OfficialSession | null {
  if (!storage) return null
  try {
    const parsed: unknown = JSON.parse(storage.getItem(OFFICIAL_SESSION_KEY) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const row = parsed as Partial<OfficialSession>
    if (!row.token || !row.userId || !row.membershipId || !row.role || !row.deviceId) return null
    return {
      token: row.token,
      userId: row.userId,
      membershipId: row.membershipId,
      role: row.role,
      deviceId: row.deviceId,
    }
  } catch {
    return null
  }
}

export function saveOfficialSession(storage: Pick<Storage, 'setItem'> | null, session: OfficialSession) {
  storage?.setItem(OFFICIAL_SESSION_KEY, JSON.stringify(session))
}

export function clearOfficialSession(storage: Pick<Storage, 'removeItem'> | null) {
  storage?.removeItem(OFFICIAL_SESSION_KEY)
}
