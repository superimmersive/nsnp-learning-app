import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import { createDatabase } from './db.ts'
import { loadConfig } from './config.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

export async function migrate(owner: pg.Pool, directory = path.join(here, '../../supabase/migrations')): Promise<string[]> {
  await owner.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  const applied = new Set(
    (await owner.query<{ id: string }>('SELECT id FROM schema_migrations ORDER BY id')).rows.map((row) => row.id),
  )
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
  const ran: string[] = []
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(directory, file), 'utf8')
    await owner.query('BEGIN')
    try {
      await owner.query(sql)
      await owner.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file])
      await owner.query('COMMIT')
      ran.push(file)
    } catch (error) {
      await owner.query('ROLLBACK')
      throw error
    }
  }
  return ran
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const database = createDatabase(loadConfig())
  migrate(database.owner)
    .then((ran) => {
      console.info(ran.length ? `Applied ${ran.join(', ')}` : 'Migrations already applied')
      return database.close()
    })
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
}
