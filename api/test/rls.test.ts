import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type pg from 'pg'
import { importSchools } from '../src/import-schools.ts'
import { setupDatabase } from './helpers.ts'

let owner: pg.Pool
let app: pg.Pool
let close: () => Promise<void>

before(async () => {
  const database = await setupDatabase()
  owner = database.owner
  app = database.app
  close = () => database.close()
  await owner.query(
    `INSERT INTO province (id, name) VALUES ('province-other', 'Somewhere Else') ON CONFLICT DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO district (id, province_id, name) VALUES ('district-other', 'province-other', 'Other District') ON CONFLICT DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO school (id, district_id, school_number, name, phase)
     VALUES ('school-other', 'district-other', '80000001', 'Other Example Primary', 'primary')
     ON CONFLICT DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO person (id, first_name, surname, cellphone)
     VALUES ('user-a', 'Ada', 'Example', '+27821110001'), ('user-b', 'Bongi', 'Example', '+27821110002')
     ON CONFLICT DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO membership (id, user_id, role, scope, school_id, status)
     VALUES
       ('mem-a', 'user-a', 'nsnp_coordinator', 'school', 'school-90000001', 'active'),
       ('mem-b', 'user-b', 'food_handler', 'school', 'school-90000002', 'active')
     ON CONFLICT DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO daily_feeding_stat (
       id, school_id, feeding_date, breakfast_fed, main_meal_fed, main_meal_time, submitted_by, client_recorded_at
     ) VALUES
       ('stat-a', 'school-90000001', '2026-10-27', 10, 20, '12:10', 'mem-a', '2026-10-27T12:10:00+02:00'),
       ('stat-b', 'school-90000002', '2026-10-27', 11, 21, '12:10', 'mem-b', '2026-10-27T12:10:00+02:00')
     ON CONFLICT DO NOTHING`,
  )
})

after(async () => {
  await close()
})

async function asUser(settings: Record<string, string>): Promise<pg.PoolClient> {
  const client = await app.connect()
  await client.query('BEGIN')
  for (const [key, value] of Object.entries(settings)) {
    await client.query('SELECT set_config($1, $2, true)', [key, value])
  }
  return client
}

describe('row level security', () => {
  it('stops one school reading another school or its counts', async () => {
    const client = await asUser({
      'nsnp.user_id': 'user-a',
      'nsnp.membership_id': 'mem-a',
      'nsnp.role': 'nsnp_coordinator',
      'nsnp.scope': 'school',
      'nsnp.school_id': 'school-90000001',
    })
    try {
      const schools = await client.query('SELECT id FROM school ORDER BY id')
      assert.deepEqual(schools.rows.map((row) => row.id), ['school-90000001'])
      const stats = await client.query('SELECT id FROM daily_feeding_stat ORDER BY id')
      assert.deepEqual(stats.rows.map((row) => row.id), ['stat-a'])
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })

  it('lets a trial official see every school in the district and not another district', async () => {
    const client = await asUser({
      'nsnp.user_id': 'user-official-1',
      'nsnp.membership_id': 'mem-official-1',
      'nsnp.role': 'district_official',
      'nsnp.scope': 'district',
      'nsnp.district_id': 'district-eden',
    })
    try {
      const schools = await client.query('SELECT id FROM school')
      const ids = schools.rows.map((row) => row.id)
      assert.equal(ids.includes('school-90000001'), true)
      assert.equal(ids.includes('school-90000012'), true)
      assert.equal(ids.includes('school-other'), false)
      assert.equal(ids.length, 12)
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })

  it('hides trial rows from a super-admin until a support reason is set', async () => {
    const blocked = await asUser({
      'nsnp.user_id': 'user-admin',
      'nsnp.membership_id': 'mem-admin',
      'nsnp.role': 'super_admin',
      'nsnp.scope': 'platform',
    })
    try {
      const hidden = await blocked.query('SELECT id FROM school')
      assert.equal(hidden.rows.length, 0)
    } finally {
      await blocked.query('ROLLBACK')
      blocked.release()
    }

    const allowed = await asUser({
      'nsnp.user_id': 'user-admin',
      'nsnp.membership_id': 'mem-admin',
      'nsnp.role': 'super_admin',
      'nsnp.scope': 'platform',
      'nsnp.support_reason': 'School asked for help with a count',
    })
    try {
      const visible = await allowed.query('SELECT id FROM school')
      assert.equal(visible.rows.length, 13)
      await allowed.query(
        `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary, reason)
         VALUES ('audit-rls', 'mem-admin', 'support.viewed', 'platform', 'trial', 'Opened trial records.', 'School asked for help with a count')`,
      )
      const audit = await allowed.query(`SELECT reason FROM audit_event WHERE id = 'audit-rls'`)
      assert.equal(audit.rows[0]?.reason, 'School asked for help with a count')
    } finally {
      await allowed.query('ROLLBACK')
      allowed.release()
    }
  })

  it('rejects a school CSV row from outside the trial district', async () => {
    await assert.rejects(
      () =>
        importSchools(
          owner,
          [
            {
              schoolNumber: '70000001',
              name: 'Cape Town Example Primary',
              phase: 'primary',
              quintile: 1,
              enrolment: 100,
              district: 'Metro Central Education District',
            },
          ],
          'Eden and Central Karoo Education District',
        ),
      /not the trial district/,
    )
  })

  it('keeps quiz answers off the official view', async () => {
    await owner.query(
      `INSERT INTO quiz_attempt (id, user_id, module_id, content_release_id, correct, total, passed, answers, client_recorded_at)
       VALUES ('attempt-a', 'user-a', 'what-is-nsnp', 'release-en-2026', 4, 5, true, '{"purpose":1}'::jsonb, '2026-10-27T10:00:00+02:00')
       ON CONFLICT DO NOTHING`,
    )
    const official = await asUser({
      'nsnp.user_id': 'user-official-1',
      'nsnp.membership_id': 'mem-official-1',
      'nsnp.role': 'district_official',
      'nsnp.scope': 'district',
      'nsnp.district_id': 'district-eden',
    })
    try {
      const attempts = await official.query('SELECT id FROM quiz_attempt')
      assert.equal(attempts.rows.length, 0)
    } finally {
      await official.query('ROLLBACK')
      official.release()
    }
  })
})
