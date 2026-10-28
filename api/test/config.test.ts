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
  })

  it('returns no session secret until Vault exists, without printing a value', async () => {
    const found = await owner.query('SELECT public.session_secret() AS secret')
    const value = found.rows[0]?.secret
    const shaped = value == null || (typeof value === 'string' && /^[0-9a-f]{64}$/.test(value))
    assert.equal(shaped, true)
  })
})
