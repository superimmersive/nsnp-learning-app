import type { AddressInfo } from 'node:net'
import { loadConfig } from '../src/config.ts'
import { createDatabase, type Database } from '../src/db.ts'
import { migrate } from '../src/migrate.ts'
import { resetTrial, seedTrial } from '../src/seed.ts'
import { createServerApp } from '../src/app.ts'
import { createSmsProvider } from '../src/sms.ts'

export function testEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://nsnp_migrator:nsnp_migrator@127.0.0.1:5432/nsnp_test',
    DATABASE_APP_URL: process.env.DATABASE_APP_URL ?? 'postgres://nsnp_app:nsnp_app@127.0.0.1:5432/nsnp_test',
    SMS_PROVIDER: 'console',
    SMS_PEPPER: 'test-sms',
    TOKEN_PEPPER: 'test-token',
    PIN_PEPPER: 'test-pin',
    SEED_OFFICIAL_TOKEN: 'local-dev-official',
    SEED_ADMIN_TOKEN: 'local-dev-admin',
  }
}

export async function setupDatabase(): Promise<Database> {
  const env = testEnv()
  const database = createDatabase(loadConfig(env))
  await database.owner.query(`
    DO $$ BEGIN
      CREATE ROLE nsnp_app LOGIN PASSWORD 'nsnp_app' NOSUPERUSER NOBYPASSRLS;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await migrate(database.owner)
  await resetTrial(database.owner)
  await seedTrial(database.owner, env)
  return database
}

export async function listen(database: Database) {
  const env = testEnv()
  const config = loadConfig(env)
  const server = createServerApp({ config, db: database, sms: createSmsProvider('console', env) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address() as AddressInfo
  return {
    base: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  }
}

export async function post(base: string, path: string, body: unknown, token?: string, reason?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (reason) headers['x-support-reason'] = reason
  const response = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = (await response.json()) as Record<string, unknown>
  return { status: response.status, json }
}

export async function get(base: string, path: string, token?: string, reason?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (reason) headers['x-support-reason'] = reason
  const response = await fetch(`${base}${path}`, { headers })
  const type = response.headers.get('content-type') ?? ''
  if (type.includes('text/csv')) return { status: response.status, text: await response.text(), json: {} }
  const json = (await response.json()) as Record<string, unknown>
  return { status: response.status, json, text: '' }
}
