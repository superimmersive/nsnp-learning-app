import pg from 'pg'
import type { Config } from './config.ts'
import { HttpError } from './errors.ts'

pg.types.setTypeParser(1082, (value) => value)

const { Pool } = pg

export type Database = {
  owner: pg.Pool
  app: pg.Pool
  close(): Promise<void>
}

export function createDatabase(config: Pick<Config, 'databaseUrl' | 'databaseAppUrl'>): Database {
  const owner = new Pool({ connectionString: config.databaseUrl })
  const app = new Pool({ connectionString: config.databaseAppUrl })
  return {
    owner,
    app,
    async close() {
      await owner.end()
      await app.end()
    },
  }
}

export type MembershipContext = {
  userId: string
  membershipId: string
  role: string
  scope: string
  schoolId: string | null
  districtId: string | null
  provinceId: string | null
}

export async function withScope<T>(
  database: Database,
  ctx: MembershipContext,
  reason: string | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  if (ctx.scope === 'platform' && !reason?.trim()) {
    throw new HttpError(400, 'A reason is required')
  }
  const client = await database.app.connect()
  try {
    await client.query('BEGIN')
    await setConfig(client, 'nsnp.user_id', ctx.userId)
    await setConfig(client, 'nsnp.membership_id', ctx.membershipId)
    await setConfig(client, 'nsnp.role', ctx.role)
    await setConfig(client, 'nsnp.scope', ctx.scope)
    await setConfig(client, 'nsnp.school_id', ctx.schoolId ?? '')
    await setConfig(client, 'nsnp.district_id', ctx.districtId ?? '')
    await setConfig(client, 'nsnp.province_id', ctx.provinceId ?? '')
    await setConfig(client, 'nsnp.support_reason', reason?.trim() ?? '')
    if (ctx.scope === 'platform') {
      await client.query(
        `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary, reason)
         VALUES ($1, $2, 'support.viewed', 'platform', 'trial', $3, $4)`,
        [
          `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ctx.membershipId,
          'Opened trial records.',
          reason?.trim(),
        ],
      )
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function setConfig(client: pg.PoolClient, name: string, value: string) {
  await client.query('SELECT set_config($1, $2, true)', [name, value])
}
