import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import { loadConfig } from './config.ts'
import { createDatabase } from './db.ts'
import { hashSecret } from './hash.ts'
import { importSchoolFile } from './import-schools.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const STAFF_CODES: Record<string, string> = {
  '90000001': 'HANDL2',
  '90000002': 'HARB2K',
  '90000003': 'GANN3K',
  '90000004': 'KEUR4K',
  '90000005': 'STON5K',
  '90000006': 'BERG6K',
  '90000007': 'MELK7K',
  '90000008': 'PLAT8K',
  '90000009': 'DRYH9K',
  '90000010': 'LANG2K',
  '90000011': 'SOUT3K',
  '90000012': 'WITK4K',
}

export async function resetTrial(owner: pg.Pool) {
  await owner.query(`
    TRUNCATE
      session, device_pin, device, sms_code, phone_change, consent_record, audit_event,
      issue_report, monthly_pack, daily_feeding_stat, checklist_snapshot, certificate,
      quiz_attempt, module_progress, staff_code, join_code, official_assignment,
      membership, person, content_release, school, district, province
    RESTART IDENTITY CASCADE
  `)
}

export async function seedTrial(owner: pg.Pool, env: NodeJS.ProcessEnv = process.env) {
  const config = loadConfig(env)
  await owner.query(
    `INSERT INTO province (id, name) VALUES ('province-wc', 'Western Cape Education Department')
     ON CONFLICT (id) DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO district (id, province_id, name, active)
     VALUES ('district-eden', 'province-wc', $1, true)
     ON CONFLICT (id) DO NOTHING`,
    [config.trialDistrictName],
  )
  await owner.query(
    `INSERT INTO content_release (id, locale, content_hash, published_at, note)
     VALUES ('release-en-2026', 'en', 'example-en-2026-10', '2026-10-01T08:00:00+02:00', 'English lessons for the trial.')
     ON CONFLICT (id) DO NOTHING`,
  )
  const csv = path.join(here, '../seed/eden-central-karoo-schools.csv')
  await importSchoolFile(owner, csv, config.trialDistrictName)

  await owner.query(
    `INSERT INTO person (id, first_name, surname, cellphone)
     VALUES
       ('user-official-1', 'Example', 'Official One', '+27820001001'),
       ('user-official-2', 'Example', 'Official Two', '+27820001002'),
       ('user-admin', 'Devon', 'Placeholder', '+27000000000')
     ON CONFLICT (id) DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO membership (id, user_id, role, scope, status, approved_by)
     VALUES ('mem-admin', 'user-admin', 'super_admin', 'platform', 'active', NULL)
     ON CONFLICT (id) DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO membership (id, user_id, role, scope, district_id, status, approved_by)
     VALUES
       ('mem-official-1', 'user-official-1', 'district_official', 'district', 'district-eden', 'active', 'mem-admin'),
       ('mem-official-2', 'user-official-2', 'district_official', 'district', 'district-eden', 'active', 'mem-admin')
     ON CONFLICT (id) DO NOTHING`,
  )

  for (const [number, code] of Object.entries(STAFF_CODES)) {
    await owner.query(
      `INSERT INTO staff_code (id, school_id, code)
       VALUES ($1, $2, $3)
       ON CONFLICT (school_id) DO NOTHING`,
      [`staff-school-${number}`, `school-${number}`, code],
    )
  }

  await owner.query(
    `INSERT INTO join_code (id, school_id, code, cellphone, intended_role, expires_at, issued_by)
     VALUES (
       'code-dryveld', 'school-90000009', 'DRY4K2', '+27820000091', 'nsnp_coordinator',
       now() + interval '14 days', 'mem-official-1'
     )
     ON CONFLICT (id) DO NOTHING`,
  )
  await owner.query(
    `INSERT INTO join_code (id, school_id, code, cellphone, intended_role, expires_at, issued_by)
     VALUES (
       'code-dryveld-old', 'school-90000009', 'OLD2K4', '+27820000099', 'nsnp_coordinator',
       '2026-10-01T15:00:00+02:00', 'mem-official-1'
     )
     ON CONFLICT (id) DO NOTHING`,
  )

  const officialToken = env.SEED_OFFICIAL_TOKEN?.trim() || 'local-dev-official'
  const adminToken = env.SEED_ADMIN_TOKEN?.trim() || 'local-dev-admin'
  await owner.query(
    `INSERT INTO session (id, user_id, membership_id, token_hash, expires_at)
     VALUES
       ('session-official', 'user-official-1', 'mem-official-1', $1, now() + interval '30 days'),
       ('session-admin', 'user-admin', 'mem-admin', $2, now() + interval '30 days')
     ON CONFLICT (id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`,
    [hashSecret(officialToken, config.tokenPepper), hashSecret(adminToken, config.tokenPepper)],
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const database = createDatabase(loadConfig())
  seedTrial(database.owner)
    .then(async () => {
      console.info('Seeded the example trial district')
      await database.close()
    })
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
}
