import { describe, expect, it } from 'vitest'
import { content } from './content.ts'
import { requiredCorrect } from './calculator.ts'

describe('roadshow content', () => {
  it('has the 11 roadshow modules in order', () => {
    expect(content.modules).toHaveLength(11)
    expect(content.modules.map((module) => module.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const ids = content.modules.map((module) => module.id)
    expect(new Set(ids).size).toBe(11)
  })

  it('gives every module cards, key rules, and a short quiz', () => {
    for (const module of content.modules) {
      expect(module.cards.length).toBeGreaterThan(0)
      expect(module.keyRules.length).toBeGreaterThan(0)
      expect(module.quiz.length).toBeGreaterThanOrEqual(3)
      expect(module.quiz.length).toBeLessThanOrEqual(5)
      const questionIds = module.quiz.map((question) => question.id)
      expect(new Set(questionIds).size).toBe(questionIds.length)
      for (const question of module.quiz) {
        expect(question.options.length).toBeGreaterThanOrEqual(2)
        expect(question.answer).toBeGreaterThanOrEqual(0)
        expect(question.answer).toBeLessThan(question.options.length)
        expect(question.feedback.trim().length).toBeGreaterThan(10)
        expect(question.prompt.trim().length).toBeGreaterThan(8)
      }
    }
  })

  it('includes the three working checklists', () => {
    const ids = content.checklists.map((list) => list.id)
    expect(ids).toEqual(['preparation-area', 'delivery-checks', 'monthly-forms'])
    for (const list of content.checklists) {
      expect(list.items.length).toBeGreaterThan(3)
      const itemIds = list.items.map((item) => item.id)
      expect(new Set(itemIds).size).toBe(itemIds.length)
    }
  })

  it('keeps the times people confuse on the deadlines page', () => {
    const flat = content.deadlines.flatMap((group) => group.items)
    const text = flat.map((item) => `${item.when} ${item.detail}`).join(' ')
    expect(text).toContain('08:00')
    expect(text).toContain('12:30')
    expect(text).toContain('13:30')
    expect(text).toContain('7th')
    expect(text).toContain('R2,256.00')
    expect(text).toContain('R45.12')
  })

  it('uses a pass mark of 4 out of 5', () => {
    expect(requiredCorrect(5)).toBe(4)
    for (const module of content.modules) {
      expect(module.quiz).toHaveLength(5)
    }
  })
})
