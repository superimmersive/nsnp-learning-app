import { describe, expect, it } from 'vitest'
import { isDashboardRole, loadOfficialSession, OFFICIAL_SESSION_KEY, saveOfficialSession } from './session'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
}

describe('official session', () => {
  it('opens the dashboard only for a district official or the super-admin', () => {
    expect(isDashboardRole('district_official')).toBe(true)
    expect(isDashboardRole('super_admin')).toBe(true)
    expect(isDashboardRole('nsnp_coordinator')).toBe(false)
    expect(isDashboardRole('food_handler')).toBe(false)
    expect(isDashboardRole(null)).toBe(false)
  })

  it('keeps a signed-in session and ignores a partial one', () => {
    const storage = memory()
    expect(loadOfficialSession(storage)).toBeNull()
    saveOfficialSession(storage, {
      token: 'session-token',
      userId: 'user-official-1',
      membershipId: 'mem-official-1',
      role: 'district_official',
      deviceId: 'device-1',
    })
    expect(loadOfficialSession(storage)?.token).toBe('session-token')
    storage.setItem(OFFICIAL_SESSION_KEY, JSON.stringify({ token: 'only-a-token' }))
    expect(loadOfficialSession(storage)).toBeNull()
  })
})
