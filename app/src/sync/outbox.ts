export const OUTBOX_KEY = 'nsnp-trial-outbox-v1'

export type OutboxItem = {
  id: string
  path: string
  body: Record<string, unknown>
  token: string | null
  createdAt: string
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function readOutbox(storage: Pick<Storage, 'getItem'> | null): OutboxItem[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(OUTBOX_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : []
  } catch {
    return []
  }
}

export function writeOutbox(storage: Store | null, items: OutboxItem[]) {
  storage?.setItem(OUTBOX_KEY, JSON.stringify(items))
}

export function enqueueOutbox(storage: Store | null, item: OutboxItem): OutboxItem[] {
  const next = [...readOutbox(storage).filter((existing) => existing.id !== item.id), item]
  writeOutbox(storage, next)
  return next
}

/**
 * Sends queued counts. A network failure leaves the item on the phone.
 * The same client id is sent again so the server does not record it twice.
 */
export async function flushOutbox(
  storage: Store | null,
  send: (item: OutboxItem) => Promise<boolean>,
): Promise<{ sent: number; saved: number }> {
  const pending = readOutbox(storage)
  const kept: OutboxItem[] = []
  let sent = 0
  for (const item of pending) {
    try {
      const ok = await send(item)
      if (ok) sent += 1
      else kept.push(item)
    } catch {
      kept.push(item)
    }
  }
  writeOutbox(storage, kept)
  return { sent, saved: kept.length }
}
