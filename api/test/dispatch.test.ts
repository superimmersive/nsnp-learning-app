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
  return result.rows[0]?.result as { status: number; error?: string; problem?: string; body?: { schools?: unknown[] } }
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
})
