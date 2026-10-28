import { describe, expect, it } from 'vitest'
import { enqueueOutbox, flushOutbox, readOutbox, type OutboxItem } from './outbox'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function item(id: string): OutboxItem {
  return {
    id,
    path: '/v1/schools/school-90000001/daily-stats',
    body: { clientId: id, mainMealFed: 10 },
    token: null,
    createdAt: '2026-10-28T12:00:00+02:00',
  }
}

describe('count outbox', () => {
  it('keeps a count on the phone when the server cannot be reached', async () => {
    const storage = memory()
    enqueueOutbox(storage, item('count-1'))
    const result = await flushOutbox(storage, async () => {
      throw new Error('offline')
    })
    expect(result).toEqual({ sent: 0, saved: 1 })
    expect(readOutbox(storage)).toHaveLength(1)
  })

  it('removes a count after the server accepts it once', async () => {
    const storage = memory()
    enqueueOutbox(storage, item('count-1'))
    const seen: string[] = []
    const result = await flushOutbox(storage, async (entry) => {
      seen.push(String(entry.body.clientId))
      return true
    })
    expect(result).toEqual({ sent: 1, saved: 0 })
    expect(seen).toEqual(['count-1'])
    expect(readOutbox(storage)).toHaveLength(0)
  })
})