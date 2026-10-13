import { describe, expect, it } from 'vitest'
import { checklistDone, loadProgress, mergeQuiz, passedCount, saveProgress, STORAGE_KEY } from './progress.ts'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
    removeItem(key: string) {
      data.delete(key)
    },
  }
}

describe('progress on this phone', () => {
  it('keeps a pass once it is earned and remembers the best score', () => {
    const first = mergeQuiz(undefined, 4, 5, '2026-04-01T08:00:00.000Z')
    expect(first.passed).toBe(true)
    expect(first.correct).toBe(4)
    const later = mergeQuiz(first, 2, 5, '2026-04-02T08:00:00.000Z')
    expect(later.passed).toBe(true)
    expect(later.correct).toBe(4)
    const better = mergeQuiz(later, 5, 5)
    expect(better.correct).toBe(5)
  })

  it('does not pass a score under 80%', () => {
    expect(mergeQuiz(undefined, 3, 5).passed).toBe(false)
  })

  it('round-trips through storage and counts ticks', () => {
    const storage = memoryStorage()
    const state = {
      name: 'A. Dlamini',
      school: 'Example Primary',
      role: 'Principal',
      modules: {
        'what-is-nsnp': {
          visited: true,
          correct: 5,
          total: 5,
          passed: true,
          updatedAt: '2026-04-01T08:00:00.000Z',
        },
      },
      checks: {
        'preparation-area': { calendar: true, menu: false },
      },
    }
    saveProgress(storage, state)
    expect(storage.getItem(STORAGE_KEY)).toContain('A. Dlamini')
    const loaded = loadProgress(storage)
    expect(loaded.name).toBe('A. Dlamini')
    expect(passedCount(loaded, ['what-is-nsnp', 'safety'])).toBe(1)
    expect(checklistDone(loaded, 'preparation-area', ['calendar', 'menu', 'coa'])).toBe(1)
  })

  it('ignores a broken save', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadProgress(storage).name).toBe('')
  })
})
