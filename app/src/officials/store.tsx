import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadTrialSnapshot, prototypeStorage, saveTrialSnapshot } from '@/prototype/storage'
import { apiBase } from '@/sync/config'
import { fetchOfficialSnapshot, sendOfficialAction } from '@/sync/client'
import { reduceOfficials, type OfficialsAction } from './actions'
import type { OfficialsSnapshot, ViewerRole } from './types'

type ActionInput = {
  [Kind in OfficialsAction['type']]: Omit<Extract<OfficialsAction, { type: Kind }>, 'actorMembershipId' | 'at'> & {
    at?: string
  }
}[OfficialsAction['type']]

type OfficialsController = {
  snapshot: OfficialsSnapshot
  viewingAs: ViewerRole
  actorMembershipId: string
  setViewingAs: (role: ViewerRole) => void
  dispatch: (action: ActionInput) => void
  remote: boolean
  supportReason: string
  setSupportReason: (reason: string) => void
  remoteError: string | null
}

const OfficialsContext = createContext<OfficialsController | null>(null)

export function OfficialsProvider({ children }: { children: ReactNode }) {
  const storage = prototypeStorage()
  const remote = apiBase() != null
  const [snapshot, setSnapshot] = useState(() => loadTrialSnapshot(storage))
  const [viewingAs, setViewingAs] = useState<ViewerRole>('district_official')
  const [supportReason, setSupportReason] = useState('')
  const [remoteError, setRemoteError] = useState<string | null>(null)

  useEffect(() => {
    if (!remote) return
    if (viewingAs === 'super_admin' && !supportReason.trim()) return
    let cancelled = false
    void fetchOfficialSnapshot(viewingAs, supportReason)
      .then((next) => {
        if (!cancelled) {
          setSnapshot(next)
          setRemoteError(null)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'The dashboard could not load')
      })
    return () => {
      cancelled = true
    }
  }, [remote, viewingAs, supportReason])

  const api = useMemo<OfficialsController>(() => {
    const actorMembershipId = viewingAs === 'super_admin' ? 'mem-admin' : 'mem-official-1'
    return {
      snapshot,
      viewingAs,
      actorMembershipId,
      setViewingAs,
      remote,
      supportReason,
      setSupportReason,
      remoteError,
      dispatch: (action) => {
        const at = action.at ?? new Date().toISOString()
        const full = { ...action, actorMembershipId, at } as OfficialsAction
        if (remote) {
          const reason = full.type === 'support_view' ? full.reason : supportReason
          if (full.type === 'support_view') setSupportReason(full.reason)
          void sendOfficialAction(viewingAs, full, reason)
            .then(() => fetchOfficialSnapshot(viewingAs, reason))
            .then((next) => {
              setSnapshot(next)
              setRemoteError(null)
            })
            .catch((error: unknown) => {
              setRemoteError(error instanceof Error ? error.message : 'That change was not saved')
            })
          return
        }
        setSnapshot((current) => {
          const next = reduceOfficials(current, full)
          saveTrialSnapshot(storage, next)
          return next
        })
      },
    }
  }, [snapshot, viewingAs, storage, remote, supportReason, remoteError])

  return <OfficialsContext.Provider value={api}>{children}</OfficialsContext.Provider>
}

// The provider and the hook share this context. Fast refresh still works for the provider.
// oxlint-disable-next-line react/only-export-components
export function useOfficials() {
  const value = useContext(OfficialsContext)
  if (!value) throw new Error('useOfficials must be used inside OfficialsProvider')
  return value
}
