import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { get, listen, post, setupDatabase } from './helpers.ts'

let base = ''
let closeAll: () => Promise<void> = async () => {}

before(async () => {
  const database = await setupDatabase()
  const server = await listen(database)
  base = server.base
  closeAll = async () => {
    await server.close()
    await database.close()
  }
})

after(async () => {
  await closeAll()
})

describe('join and sign-in', () => {
  it('rejects a coordinator code for a different cellphone and an expired code', async () => {
    const wrong = await post(base, '/v1/join/coordinator', {
      code: 'DRY4K2',
      firstName: 'Naledi',
      surname: 'Jacobs',
      cellphone: '0820000092',
      consent: true,
    })
    assert.equal(wrong.status, 400)
    assert.equal(wrong.json.problem, 'wrong_number')

    const expired = await post(base, '/v1/join/coordinator', {
      code: 'OLD2K4',
      firstName: 'Naledi',
      surname: 'Jacobs',
      cellphone: '0820000099',
      consent: true,
    })
    assert.equal(expired.status, 400)
    assert.equal(expired.json.problem, 'expired')
  })

  it('claims a school, approves staff, and loads progress on a new phone', async () => {
    const claim = await post(base, '/v1/join/coordinator', {
      code: 'DRY4K2',
      firstName: 'Naledi',
      surname: 'Jacobs',
      cellphone: '0820000091',
      consent: true,
    })
    assert.equal(claim.status, 200)
    assert.equal(typeof claim.json.demoCode, 'string')

    const session = await post(base, '/v1/auth/sms/verify', {
      cellphone: '0820000091',
      code: claim.json.demoCode,
      purpose: 'join',
    })
    assert.equal(session.status, 200)
    const token = String(session.json.token)

    const staff = await post(base, '/v1/join/staff', {
      code: 'DRYH9K',
      firstName: 'Amina',
      surname: 'Solomons',
      cellphone: '0825550188',
      role: 'food_handler',
      consent: true,
    })
    assert.equal(staff.status, 200)
    assert.equal(staff.json.status, 'pending')

    const decision = await post(
      base,
      `/v1/memberships/${staff.json.membershipId}/decision`,
      { decision: 'active' },
      token,
    )
    assert.equal(decision.status, 200)

    const staffSession = await post(base, '/v1/auth/sms/verify', {
      cellphone: '0825550188',
      code: staff.json.demoCode,
      purpose: 'join',
    })
    assert.equal(staffSession.status, 200)

    const pin = await post(base, '/v1/me/pin', { pin: '2468', markUsed: true }, token)
    assert.equal(pin.status, 200)
    const easy = await post(base, '/v1/me/pin', { pin: '1234', deviceId: pin.json.deviceId }, token)
    assert.equal(easy.status, 400)

    const count = await post(
      base,
      '/v1/schools/school-90000009/daily-stats',
      {
        feedingDate: '2026-10-28',
        breakfastFed: 40,
        mainMealFed: 120,
        mainMealTime: '12:20',
        clientRecordedAt: new Date().toISOString(),
        clientId: 'count-1',
      },
      token,
    )
    assert.equal(count.status, 200)
    const again = await post(
      base,
      '/v1/schools/school-90000009/daily-stats',
      {
        feedingDate: '2026-10-28',
        breakfastFed: 1,
        mainMealFed: 1,
        mainMealTime: '12:20',
        clientRecordedAt: new Date().toISOString(),
        clientId: 'count-1',
      },
      token,
    )
    assert.equal(again.json.duplicate, true)

    const otherSchool = await post(
      base,
      '/v1/schools/school-90000001/daily-stats',
      { feedingDate: '2026-10-28', breakfastFed: 1, mainMealFed: 1, mainMealTime: '12:00', clientRecordedAt: new Date().toISOString() },
      token,
    )
    assert.equal(otherSchool.status, 403)

    const recovery = await post(base, '/v1/auth/recover', { cellphone: '0820000091' })
    const recovered = await post(base, '/v1/auth/sms/verify', {
      cellphone: '0820000091',
      code: recovery.json.demoCode,
      purpose: 'recover',
    })
    assert.equal(recovered.status, 200)
    const mine = await get(base, '/v1/me', String(recovered.json.token))
    assert.equal(mine.status, 200)
  })

  it('switches person with the device PIN and rejects a wrong PIN', async () => {
    const issued = await post(
      base,
      '/v1/join-codes',
      { schoolId: 'school-90000008', cellphone: '0820000081', intendedRole: 'nsnp_coordinator', code: 'PLAT2K' },
      'local-dev-official',
    )
    assert.equal(issued.status, 200)
    const claim = await post(base, '/v1/join/coordinator', {
      code: 'PLAT2K',
      firstName: 'Elma',
      surname: 'Example',
      cellphone: '0820000081',
      consent: true,
    })
    const session = await post(base, '/v1/auth/sms/verify', {
      cellphone: '0820000081',
      code: claim.json.demoCode,
      purpose: 'join',
    })
    const token = String(session.json.token)
    const pin = await post(base, '/v1/me/pin', { pin: '2580', deviceId: 'device-plat' }, token)
    assert.equal(pin.status, 200)
    const bad = await post(base, '/v1/devices/device-plat/switch', { userId: session.json.userId, pin: '0000' })
    assert.equal(bad.status, 400)
    const good = await post(base, '/v1/devices/device-plat/switch', { userId: session.json.userId, pin: '2580' })
    assert.equal(good.status, 200)

    const pg = (await import('pg')).default
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgres://nsnp_migrator:nsnp_migrator@127.0.0.1:5432/nsnp_test',
    })
    await pool.query(`UPDATE device SET last_check_in_at = now() - interval '8 days' WHERE id = 'device-plat'`)
    await pool.end()
    const locked = await post(base, '/v1/devices/device-plat/switch', { userId: session.json.userId, pin: '2580' })
    assert.equal(locked.status, 403)
    assert.match(String(locked.json.error), /signal/)
  })

  it('issues one certificate after all 11 modules are passed', async () => {
    const issued = await post(
      base,
      '/v1/join-codes',
      { schoolId: 'school-90000003', cellphone: '0820000031', intendedRole: 'nsnp_coordinator', code: 'GANN9K' },
      'local-dev-official',
    )
    assert.equal(issued.status, 200)
    const claim = await post(base, '/v1/join/coordinator', {
      code: 'GANN9K',
      firstName: 'Piet',
      surname: 'Example',
      cellphone: '0820000031',
      consent: true,
    })
    const session = await post(base, '/v1/auth/sms/verify', {
      cellphone: '0820000031',
      code: claim.json.demoCode,
      purpose: 'join',
    })
    const token = String(session.json.token)
    const modules = [
      'what-is-nsnp',
      'preparation-area',
      'volunteer-food-handlers',
      'nsnp-committee',
      'monthly-forms',
      'menu-and-times',
      'feeding-with-dignity',
      'food-safety',
      'deliveries-and-storage',
      'safety',
      'daily-statistics',
    ].map((moduleId) => ({ moduleId, correct: 4, total: 5, passed: true }))
    const early = await post(base, '/v1/me/certificate', {}, token)
    assert.equal(early.status, 400)
    const saved = await post(base, '/v1/me/progress', { modules }, token)
    assert.equal(saved.status, 200)
    const certificate = await post(base, '/v1/me/certificate', {}, token)
    assert.equal(certificate.status, 200)
    assert.equal(typeof certificate.json.verificationCode, 'string')
    const again = await post(base, '/v1/me/certificate', {}, token)
    assert.equal(again.json.alreadyIssued, true)
    assert.equal(again.json.id, certificate.json.id)
  })

  it('shows the trial list to an official and requires a reason for the super-admin', async () => {
    const official = await get(base, '/v1/officials/snapshot', 'local-dev-official')
    assert.equal(official.status, 200)
    const schools = official.json.schools as unknown[]
    assert.equal(schools.length, 12)

    const blocked = await get(base, '/v1/officials/snapshot', 'local-dev-admin')
    assert.equal(blocked.status, 400)

    const opened = await get(base, '/v1/officials/snapshot', 'local-dev-admin', 'Checking the example trial')
    assert.equal(opened.status, 200)
    const audit = opened.json.auditEvents as { reason: string | null }[]
    assert.equal(audit.some((event) => event.reason === 'Checking the example trial'), true)

    const exported = await get(base, '/v1/officials/export', 'local-dev-official')
    assert.equal(exported.status, 200)
    assert.match(exported.text, /90000001/)
  })
})
