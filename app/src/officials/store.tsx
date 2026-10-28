import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadTrialSnapshot, prototypeStorage, saveTrialSnapshot } from '@/prototype/storage'
import { apiBase } from '@/sync/config'
import { fetchOfficialSnapshot, sendOfficialAction } from '@/sync/client'
import { reduceOfficials, type OfficialsAction } from './actions'
import {
  clearOfficialSession,
  isDashboardRole,
  loadOfficialSession,
  saveOfficialSession,
  type OfficialSession,
} from './session'
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
  live: boolean
  session: OfficialSession | null
  signIn: (session: OfficialSession) => void
  signOut: () => void
  supportReason: string
  setSupportReason: (reason: string) => void
  remoteError: string | null
}

const OfficialsContext = createContext<OfficialsController | null>(null)

export function OfficialsProvider({ children }: { children: ReactNode }) {
  const storage = prototypeStorage()
  const remote = apiBase() != null
  const [snapshot, setSnapshot] = useState(() => loadTrialSnapshot(storage))
  const [viewingAsState, setViewingAs] = useState<ViewerRole>('district_official')
  const [session, setSession] = useState<OfficialSession | null>(() => loadOfficialSession(storage))
  const [live, setLive] = useState(false)
  const [supportReason, setSupportReason] = useState('')
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const viewingAs: ViewerRole = remote
    ? session?.role === 'super_admin'
      ? 'super_admin'
      : 'district_official'
    : viewingAsState

  useEffect(() => {
    if (!remote || !session || !isDashboardRole(session.role)) return
    if (viewingAs === 'super_admin' && !supportReason.trim()) return
    let cancelled = false
    void fetchOfficialSnapshot(session.token, viewingAs, supportReason)
      .then((next) => {
        if (!cancelled) {
          setSnapshot(next)
          setLive(true)
          setRemoteError(null)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'The dashboard could not load')
      })
    return () => {
      cancelled = true
    }
  }, [remote, session, viewingAs, supportReason])

  const api = useMemo<OfficialsController>(() => {
    const actorMembershipId = remote
      ? (session?.membershipId ?? '')
      : viewingAs === 'super_admin'
        ? 'mem-admin'
        : 'mem-official-1'
    return {
      snapshot,
      viewingAs,
      actorMembershipId,
      setViewingAs,
      remote,
      live,
      session,
      signIn: (next) => {
        saveOfficialSession(storage, next)
        setSession(next)
        setLive(false)
        setRemoteError(null)
      },
      signOut: () => {
        clearOfficialSession(storage)
        setSession(null)
        setLive(false)
        setSupportReason('')
        setRemoteError(null)
      },
      supportReason,
      setSupportReason,
      remoteError,
      dispatch: (action) => {
        const at = action.at ?? new Date().toISOString()
        const full = { ...action, actorMembershipId, at } as OfficialsAction
        if (remote) {
          if (!session) return
          const reason = full.type === 'support_view' ? full.reason : supportReason
          if (full.type === 'support_view') setSupportReason(full.reason)
          void sendOfficialAction(session.token, viewingAs, full, reason)
            .then(() => fetchOfficialSnapshot(session.token, viewingAs, reason))
            .then((next) => {
              setSnapshot(next)
              setLive(true)
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
  }, [snapshot, viewingAs, storage, remote, live, session, supportReason, remoteError])

  return <OfficialsContext.Provider value={api}>{children}</OfficialsContext.Provider>
}

// The provider and the hook share this context. Fast refresh still works for the provider.
// oxlint-disable-next-line react/only-export-components
export function useOfficials() {
  const value = useContext(OfficialsContext)
  if (!value) throw new Error('useOfficials must be used inside OfficialsProvider')
  return value
}
