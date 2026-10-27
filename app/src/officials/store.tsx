import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { reduceOfficials, type OfficialsAction } from './actions'
import { createExampleSnapshot } from './mockData'
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
}

const OfficialsContext = createContext<OfficialsController | null>(null)

export function OfficialsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(createExampleSnapshot)
  const [viewingAs, setViewingAs] = useState<ViewerRole>('district_official')

  const api = useMemo<OfficialsController>(() => {
    const actorMembershipId = viewingAs === 'super_admin' ? 'mem-admin' : 'mem-official-1'
    return {
      snapshot,
      viewingAs,
      actorMembershipId,
      setViewingAs,
      dispatch: (action) => {
        const at = action.at ?? new Date().toISOString()
        setSnapshot((current) =>
          reduceOfficials(current, {
            ...action,
            actorMembershipId,
            at,
          } as OfficialsAction),
        )
      },
    }
  }, [snapshot, viewingAs])

  return <OfficialsContext.Provider value={api}>{children}</OfficialsContext.Provider>
}

// The provider and the hook share this context. Fast refresh still works for the provider.
// oxlint-disable-next-line react/only-export-components
export function useOfficials() {
  const value = useContext(OfficialsContext)
  if (!value) throw new Error('useOfficials must be used inside OfficialsProvider')
  return value
}
