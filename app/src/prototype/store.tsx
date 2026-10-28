import { createContext, useContext, useState, type ReactNode } from 'react'
import type { OfficialsSnapshot } from '@/officials/types'
import type { PhoneSession } from './phone'
import { loadPhoneSession, loadTrialSnapshot, prototypeStorage, savePhoneSession, saveTrialSnapshot } from './storage'

type PrototypeController = {
  snapshot: OfficialsSnapshot
  phone: PhoneSession
  replaceSnapshot: (next: OfficialsSnapshot) => void
  replacePhone: (next: PhoneSession) => void
}

const PrototypeContext = createContext<PrototypeController | null>(null)

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const storage = prototypeStorage()
  const [snapshot, setSnapshot] = useState(() => loadTrialSnapshot(storage))
  const [phone, setPhone] = useState(() => loadPhoneSession(storage, new Date().toISOString()))

  const api: PrototypeController = {
    snapshot,
    phone,
    replaceSnapshot: (next) => {
      saveTrialSnapshot(storage, next)
      setSnapshot(next)
    },
    replacePhone: (next) => {
      savePhoneSession(storage, next)
      setPhone(next)
    },
  }

  return <PrototypeContext.Provider value={api}>{children}</PrototypeContext.Provider>
}

// The provider and the hook share this context. Fast refresh still works for the provider.
// oxlint-disable-next-line react/only-export-components
export function usePrototype() {
  const value = useContext(PrototypeContext)
  if (!value) throw new Error('usePrototype must be used inside PrototypeProvider')
  return value
}
