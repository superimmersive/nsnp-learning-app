import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { setupDatabase } from './helpers.ts'

let owner: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
  connect: () => Promise<{ query: (sql: string) => Promise<unknown>; release: () => void }>
}
let close: () => Promise<void>

before(async () => {
  const database = await setupDatabase()
  owner = database.owner
  close = () => database.close()
})

after(async () => {
  await close()
})

async function expectDenied(sql: string) {
  const client = await owner.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE nsnp_app')
    await assert.rejects(() => client.query(sql), /permission denied/i)
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
}

describe('vault secret and private config', () => {
  it('keeps the test SMS code in a table the app role cannot read', async () => {
    const config = await owner.query(`SELECT value FROM private_config WHERE name = 'DEV_FIXED_OTP'`)
    assert.equal(config.rows[0]?.value, '123456')
    const lock = await owner.query(
      `SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
              (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) AS policies
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'private_config'`,
    )
    assert.equal(lock.rows[0]?.rls, true)
    assert.equal(lock.rows[0]?.forced, false)
    assert.equal(Number(lock.rows[0]?.policies), 0)

    await expectDenied('SELECT value FROM private_config')
    await expectDenied('SELECT public.session_secret()')
    await expectDenied(`SELECT public.dispatch('health', NULL, NULL, '{}'::jsonb)`)
  })

  it('sets a search_path and leaves staff codes with one select policy', async () => {
    const paths = await owner.query(
      `SELECT n.nspname || '.' || p.proname AS name, p.proconfig
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE (n.nspname, p.proname) IN (
         ('public', 'assignment_same_district'),
         ('public', 'keep_best_progress'),
         ('nsnp', 'user_id'),
         ('nsnp', 'membership_id'),
         ('nsnp', 'role'),
         ('nsnp', 'scope'),
         ('nsnp', 'school_id'),
         ('nsnp', 'district_id'),
         ('nsnp', 'province_id'),
         ('nsnp', 'has_support_reason'),
         ('nsnp', 'phones_match')
       )`,
    )
    assert.equal(paths.rows.length, 11)
    for (const row of paths.rows) {
      const config = Array.isArray(row.proconfig) ? row.proconfig.join(',') : String(row.proconfig ?? '')
      assert.match(config, /search_path=/)
    }
    const policies = await owner.query(
      `SELECT polname, polcmd FROM pg_policy
       WHERE polrelid = 'public.staff_code'::regclass
       ORDER BY polname`,
    )
    const commands = policies.rows.map((row) => String(row.polcmd))
    assert.equal(commands.includes('*'), false)
    assert.equal(commands.filter((command) => command === 'r').length, 1)
    const index = await owner.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'session_user_id_idx'`,
    )
    assert.equal(index.rows.length, 1)
  })

  it('returns no session secret until Vault exists, without printing a value', async () => {
    const found = await owner.query('SELECT public.session_secret() AS secret')
    const value = found.rows[0]?.secret
    const shaped = value == null || (typeof value === 'string' && /^[0-9a-f]{64}$/.test(value))
    assert.equal(shaped, true)
  })
})
