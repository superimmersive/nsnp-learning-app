import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import { loadConfig } from './config.ts'
import { createDatabase } from './db.ts'
import { hashSecret } from './hash.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

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
  const seedSql = await readFile(path.join(here, '../../supabase/seed.sql'), 'utf8')
  await owner.query(seedSql)

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
