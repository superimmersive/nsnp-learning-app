import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { hashSecret } from '../src/hash.ts'
import { setupDatabase } from './helpers.ts'

let owner: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
let close: () => Promise<void>

before(async () => {
  const database = await setupDatabase()
  owner = database.owner
  close = () => database.close()
})

after(async () => {
  await close()
})

async function dispatch(op: string, tokenHash: string | null, reason: string | null, payload: Record<string, unknown>) {
  const result = await owner.query('SELECT public.dispatch($1, $2, $3, $4::jsonb) AS result', [op, tokenHash, reason, JSON.stringify(payload)])
  return result.rows[0]?.result as {
    status: number
    error?: string
    problem?: string
    body?: { schools?: unknown[]; id?: string; duplicate?: boolean; person?: { id?: string } }
  }
}

const official = () => hashSecret('local-dev-official', 'test-token')
const admin = () => hashSecret('local-dev-admin', 'test-token')
const coordinator = () => hashSecret('coord-token', 'test-token')
const handler = () => hashSecret('handler-token', 'test-token')

async function asRole(userId: string, membershipId: string, role: string, schoolId: string, phone: string, token: string) {
  await owner.query(
    `INSERT INTO person (id, first_name, surname, cellphone) VALUES ($1, 'Test', 'Person', $2)
     ON CONFLICT (id) DO NOTHING`,
    [userId, phone],
  )
  await owner.query(
    `INSERT INTO membership (id, user_id, role, scope, school_id, status, approved_by)
     VALUES ($1, $2, $3, 'school', $4, 'active', 'mem-official-1')
     ON CONFLICT (id) DO NOTHING`,
    [membershipId, userId, role, schoolId],
  )
  await owner.query(
    `INSERT INTO session (id, user_id, membership_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '30 days')
     ON CONFLICT (id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`,
    [`session-${membershipId}`, userId, membershipId, token],
  )
}

describe('edge dispatch', () => {
  it('rejects a join code for the wrong cellphone', async () => {
    const result = await dispatch('join_coordinator', null, null, {
      code: 'DRY4K2',
      cellphone: '+27820000092',
      firstName: 'Naledi',
      surname: 'Jacobs',
      consent: 'true',
    })
    assert.equal(result.status, 400)
    assert.equal(result.problem, 'wrong_number')
  })

  it('returns only the trial schools to a district official', async () => {
    const token = hashSecret('local-dev-official', 'test-token')
    const result = await dispatch('snapshot', token, null, {})
    assert.equal(result.status, 200)
    assert.equal(result.body?.schools?.length, 12)
  })

  it('locks a PIN switch after 7 days', async () => {
    await owner.query(
      `INSERT INTO device (id, last_check_in_at) VALUES ('device-old', now() - interval '8 days')
       ON CONFLICT (id) DO UPDATE SET last_check_in_at = EXCLUDED.last_check_in_at`,
    )
    const result = await dispatch('switch_prepare', null, null, { deviceId: 'device-old', userId: 'user-official-1' })
    assert.equal(result.status, 403)
    assert.match(result.error ?? '', /signal/)
  })

  it('records a monthly pack once, and only from that school coordinator', async () => {
    await asRole('user-coord', 'mem-coord', 'nsnp_coordinator', 'school-90000001', '+27820002001', coordinator())
    await asRole('user-handler', 'mem-handler', 'food_handler', 'school-90000001', '+27820002002', handler())
    const denied = await dispatch('monthly_pack', handler(), null, {
      id: 'pack-denied',
      schoolId: 'school-90000001',
      period: '2026-10',
      attendanceRegisterSent: true,
      stockFormSent: true,
      proofOfPaymentSent: true,
    })
    assert.equal(denied.status, 403)
    const other = await dispatch('monthly_pack', coordinator(), null, {
      id: 'pack-other',
      schoolId: 'school-90000002',
      period: '2026-10',
    })
    assert.equal(other.status, 403)
    const saved = await dispatch('monthly_pack', coordinator(), null, {
      id: 'pack-1',
      schoolId: 'school-90000001',
      period: '2026-10',
      attendanceRegisterSent: true,
      stockFormSent: false,
      proofOfPaymentSent: true,
      clientId: 'pack-client-1',
    })
    assert.equal(saved.status, 200)
    assert.equal(saved.body && 'id' in saved.body ? saved.body.id : '', 'pack-1')
    const again = await dispatch('monthly_pack', coordinator(), null, {
      id: 'pack-2',
      schoolId: 'school-90000001',
      period: '2026-10',
      clientId: 'pack-client-1',
    })
    assert.equal(again.status, 200)
    assert.equal(again.body && 'duplicate' in again.body ? again.body.duplicate : false, true)
  })

  it('appends a count correction and refuses one without a reason', async () => {
    await asRole('user-coord', 'mem-coord', 'nsnp_coordinator', 'school-90000001', '+27820002001', coordinator())
    await owner.query(
      `INSERT INTO daily_feeding_stat (
         id, school_id, feeding_date, breakfast_fed, main_meal_fed, main_meal_time, submitted_by, client_recorded_at
       ) VALUES ('stat-base', 'school-90000001', '2026-10-27', 10, 20, '12:00', 'mem-coord', now())
       ON CONFLICT (id) DO NOTHING`,
    )
    const missing = await dispatch('daily_correction', coordinator(), null, {
      id: 'stat-base',
      newId: 'stat-fix',
      schoolId: 'school-90000001',
      breakfastFed: 11,
      mainMealFed: 20,
      mainMealTime: '12:00',
    })
    assert.equal(missing.status, 400)
    assert.match(missing.error ?? '', /reason/)
    const saved = await dispatch('daily_correction', coordinator(), null, {
      id: 'stat-base',
      newId: 'stat-fix',
      schoolId: 'school-90000001',
      breakfastFed: 11,
      mainMealFed: 21,
      mainMealTime: '12:05',
      correctionReason: 'The cook miscounted',
    })
    assert.equal(saved.status, 200)
    const row = await owner.query(
      `SELECT replaces_id, correction_reason, breakfast_fed FROM daily_feeding_stat WHERE id = 'stat-fix'`,
    )
    assert.equal(row.rows[0]?.replaces_id, 'stat-base')
    assert.equal(row.rows[0]?.correction_reason, 'The cook miscounted')
    assert.equal(row.rows[0]?.breakfast_fed, 11)
    const absent = await dispatch('daily_correction', coordinator(), null, {
      id: 'stat-missing',
      newId: 'stat-nope',
      schoolId: 'school-90000001',
      correctionReason: 'Nothing to correct',
    })
    assert.equal(absent.status, 404)
  })

  it('lets an official close an issue and hides a missing one', async () => {
    await asRole('user-coord', 'mem-coord', 'nsnp_coordinator', 'school-90000001', '+27820002001', coordinator())
    await asRole('user-handler', 'mem-handler', 'food_handler', 'school-90000001', '+27820002002', handler())
    await owner.query(
      `INSERT INTO issue_report (id, school_id, created_by, kind, body, status)
       VALUES ('issue-1', 'school-90000001', 'mem-coord', 'forms', 'The stock form is missing a page.', 'open')
       ON CONFLICT (id) DO NOTHING`,
    )
    const blocked = await dispatch('issue_close', handler(), null, { id: 'issue-1' })
    assert.equal(blocked.status, 403)
    const closed = await dispatch('issue_close', official(), null, { id: 'issue-1' })
    assert.equal(closed.status, 200)
    const row = await owner.query(`SELECT status, closed_by FROM issue_report WHERE id = 'issue-1'`)
    assert.equal(row.rows[0]?.status, 'closed')
    assert.equal(row.rows[0]?.closed_by, 'mem-official-1')
    const missing = await dispatch('issue_close', official(), null, { id: 'issue-missing' })
    assert.equal(missing.status, 404)
  })

  it('changes a cellphone only after the SMS code matches', async () => {
    await asRole('user-phone', 'mem-phone', 'food_handler', 'school-90000001', '+27820002003', hashSecret('unused', 'test-token'))
    const hash = hashSecret('123456', 'test-token')
    const started = await dispatch('phone_start', official(), null, {
      id: 'user-phone',
      changeId: 'phone-1',
      cellphone: '+27820002099',
      smsId: 'sms-phone-1',
      otpHash: hash,
    })
    assert.equal(started.status, 200)
    const wrong = await dispatch('phone_confirm', null, null, { id: 'user-phone', otpHash: hashSecret('000000', 'test-token') })
    assert.equal(wrong.status, 400)
    const still = await owner.query(`SELECT cellphone FROM person WHERE id = 'user-phone'`)
    assert.equal(still.rows[0]?.cellphone, '+27820002003')
    const confirmed = await dispatch('phone_confirm', null, null, { id: 'user-phone', otpHash: hash })
    assert.equal(confirmed.status, 200)
    const next = await owner.query(`SELECT cellphone FROM person WHERE id = 'user-phone'`)
    assert.equal(next.rows[0]?.cellphone, '+27820002099')
    const again = await dispatch('phone_confirm', null, null, { id: 'user-phone', otpHash: hash })
    assert.equal(again.status, 400)
    assert.match(again.error ?? '', /waiting/)
  })

  it('checks a phone in and refuses an unknown device', async () => {
    await owner.query(
      `INSERT INTO device (id, school_id, last_check_in_at)
       VALUES ('device-live', 'school-90000001', now() - interval '2 days')
       ON CONFLICT (id) DO UPDATE SET last_check_in_at = EXCLUDED.last_check_in_at`,
    )
    const saved = await dispatch('check_in', official(), null, { deviceId: 'device-live' })
    assert.equal(saved.status, 200)
    const row = await owner.query(`SELECT last_check_in_at > now() - interval '1 minute' AS fresh FROM device WHERE id = 'device-live'`)
    assert.equal(row.rows[0]?.fresh, true)
    const missing = await dispatch('check_in', official(), null, { deviceId: 'device-missing' })
    assert.equal(missing.status, 404)
    const blank = await dispatch('check_in', official(), null, {})
    assert.equal(blank.status, 400)
  })

  it('withdraws a join code and updates the cellphone on another', async () => {
    await owner.query(
      `INSERT INTO join_code (id, school_id, code, cellphone, intended_role, expires_at, issued_by)
       VALUES
         ('code-extra', 'school-90000001', 'EXTRA1', '+27820003001', 'nsnp_coordinator', now() + interval '14 days', 'mem-official-1'),
         ('code-extra-2', 'school-90000001', 'EXTRA2', '+27820003002', 'principal', now() + interval '14 days', 'mem-official-1')
       ON CONFLICT (id) DO NOTHING`,
    )
    const withdrawn = await dispatch('withdraw_code', official(), null, { id: 'code-extra' })
    assert.equal(withdrawn.status, 200)
    const row = await owner.query(`SELECT withdrawn_at IS NOT NULL AS gone FROM join_code WHERE id = 'code-extra'`)
    assert.equal(row.rows[0]?.gone, true)
    const updated = await dispatch('update_code_phone', official(), null, { id: 'code-extra-2', cellphone: '+27820003099' })
    assert.equal(updated.status, 200)
    const phone = await owner.query(`SELECT cellphone FROM join_code WHERE id = 'code-extra-2'`)
    assert.equal(phone.rows[0]?.cellphone, '+27820003099')
  })

  it('writes a support view for the super-admin and returns the signed-in person', async () => {
    const blocked = await dispatch('support_view', admin(), null, { schoolId: 'school-90000001' })
    assert.equal(blocked.status, 400)
    const opened = await dispatch('support_view', admin(), 'Checking the example trial', { schoolId: 'school-90000001' })
    assert.equal(opened.status, 200)
    const audit = await owner.query(
      `SELECT summary FROM audit_event WHERE action = 'support.viewed' AND subject_id = 'school-90000001'`,
    )
    assert.match(String(audit.rows[0]?.summary ?? ''), /Riverbend Example Primary/)
    const mine = await dispatch('me', official(), null, {})
    assert.equal(mine.status, 200)
    const person = mine.body?.person
    assert.equal(person?.id, 'user-official-1')
    const people = await dispatch('school_people', official(), null, { schoolId: 'school-90000001' })
    assert.equal(people.status, 200)
  })
})
