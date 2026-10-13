import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  browserStorage,
  emptyProgress,
  loadProgress,
  mergeQuiz,
  saveProgress,
  type ProgressState,
} from '@/lib/progress'

type ProgressApi = {
  state: ProgressState
  setProfile: (patch: Partial<Pick<ProgressState, 'name' | 'school' | 'role'>>) => void
  markVisited: (moduleId: string) => void
  recordQuiz: (moduleId: string, correct: number, total: number) => void
  toggleCheck: (checklistId: string, itemId: string) => void
  clearChecks: (checklistId: string) => void
  reset: () => void
}

const ProgressContext = createContext<ProgressApi | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadProgress(browserStorage()))

  useEffect(() => {
    saveProgress(browserStorage(), state)
  }, [state])

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      setProfile: (patch) => setState((current) => ({ ...current, ...patch })),
      markVisited: (moduleId) =>
        setState((current) => {
          const previous = current.modules[moduleId]
          if (previous?.visited) return current
          return {
            ...current,
            modules: {
              ...current.modules,
              [moduleId]: {
                visited: true,
                correct: previous?.correct ?? 0,
                total: previous?.total ?? 0,
                passed: previous?.passed ?? false,
                updatedAt: previous?.updatedAt ?? null,
              },
            },
          }
        }),
      recordQuiz: (moduleId, correct, total) =>
        setState((current) => ({
          ...current,
          modules: {
            ...current.modules,
            [moduleId]: mergeQuiz(current.modules[moduleId], correct, total),
          },
        })),
      toggleCheck: (checklistId, itemId) =>
        setState((current) => {
          const list = current.checks[checklistId] ?? {}
          return {
            ...current,
            checks: {
              ...current.checks,
              [checklistId]: { ...list, [itemId]: !list[itemId] },
            },
          }
        }),
      clearChecks: (checklistId) =>
        setState((current) => ({
          ...current,
          checks: { ...current.checks, [checklistId]: {} },
        })),
      reset: () => setState(emptyProgress()),
    }),
    [state],
  )

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

// The provider and the hook share this context. Fast refresh still works for the provider.
// oxlint-disable-next-line react/only-export-components
export function useProgress() {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('useProgress must be used inside ProgressProvider')
  return value
}
