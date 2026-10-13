import { isPassingScore } from './calculator.ts'

export const STORAGE_KEY = 'nsnp-learning-progress-v1'

export type ModuleProgress = {
  visited: boolean
  correct: number
  total: number
  passed: boolean
  updatedAt: string | null
}

export type ProgressState = {
  name: string
  school: string
  role: string
  modules: Record<string, ModuleProgress>
  checks: Record<string, Record<string, boolean>>
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function emptyProgress(): ProgressState {
  return { name: '', school: '', role: '', modules: {}, checks: {} }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function loadProgress(storage: Pick<Storage, 'getItem'> | null): ProgressState {
  if (!storage) return emptyProgress()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return emptyProgress()
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      school: typeof parsed.school === 'string' ? parsed.school : '',
      role: typeof parsed.role === 'string' ? parsed.role : '',
      modules: isRecord(parsed.modules) ? (parsed.modules as ProgressState['modules']) : {},
      checks: isRecord(parsed.checks) ? (parsed.checks as ProgressState['checks']) : {},
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(storage: Pick<Storage, 'setItem'> | null, state: ProgressState) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode or a full disk should not crash the lesson.
  }
}

export function browserStorage(): StorageLike | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function mergeQuiz(
  previous: ModuleProgress | undefined,
  correct: number,
  total: number,
  now = new Date().toISOString(),
): ModuleProgress {
  const passed = Boolean(previous?.passed) || isPassingScore(correct, total)
  const bestCorrect = Math.max(previous?.correct ?? 0, correct)
  return {
    visited: true,
    correct: bestCorrect,
    total,
    passed,
    updatedAt: now,
  }
}

export function passedCount(state: ProgressState, moduleIds: string[]): number {
  return moduleIds.filter((id) => state.modules[id]?.passed).length
}

export function checklistDone(state: ProgressState, checklistId: string, itemIds: string[]): number {
  const ticks = state.checks[checklistId] ?? {}
  return itemIds.filter((id) => ticks[id]).length
}
