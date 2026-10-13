import { describe, expect, it } from 'vitest'
import { estimateMeals, lookupHonorarium, scaleMeal } from './calculator.ts'
import { formatRand } from './format.ts'

describe('meal estimate', () => {
  it('matches the 500 secondary learner example', () => {
    const lines = estimateMeals(500, 500)
    const byId = Object.fromEntries(lines.map((line) => [line.id, line.label]))
    expect(byId.porridge).toBe('10 kg')
    expect(byId.rice).toBe('25 kg')
    expect(byId.samp).toBe('30 kg')
    expect(byId.soya).toBe('17.5 kg')
    expect(byId.lentils).toBe('5 kg')
    expect(byId.beans).toBe('20 kg')
    expect(byId.pilchards).toBe('75 tins')
    expect(byId.livers).toBe('70 tins')
    expect(byId.milk).toBe('500 sachets')
    expect(byId.veg).toBe('40 kg')
    expect(byId.fruit).toBe('500 fruit')
  })

  it('scales breakfast and the main meal separately', () => {
    expect(scaleMeal(10, 250)).toBe(5)
    expect(scaleMeal(25, 0)).toBe(0)
    const lines = estimateMeals(100, 0)
    expect(lines.find((line) => line.id === 'porridge')?.label).toBe('2 kg')
    expect(lines.find((line) => line.id === 'rice')?.label).toBe('0 kg')
  })
})

describe('honorarium scale', () => {
  it('formats rand the way the roadshow states it', () => {
    expect(formatRand(2256)).toBe('R2,256.00')
    expect(formatRand(2301.12)).toBe('R2,301.12')
    expect(formatRand(18408.96)).toBe('R18,408.96')
  })

  it('looks up small and large schools on the band edges', () => {
    expect(lookupHonorarium('small', 120)).toMatchObject({ volunteers: 1, amount: 2256 })
    expect(lookupHonorarium('small', 121)).toMatchObject({ volunteers: 2, amount: 4602.24 })
    expect(lookupHonorarium('small', 250)).toMatchObject({ volunteers: 2, amount: 4602.24 })
    expect(lookupHonorarium('small', 251)).toMatchObject({ ok: false, reason: 'small-too-high' })
    expect(lookupHonorarium('small', 0)).toMatchObject({ ok: false, reason: 'enter' })

    expect(lookupHonorarium('large', 1)).toMatchObject({ volunteers: 1, amount: 2301.12 })
    expect(lookupHonorarium('large', 210)).toMatchObject({ volunteers: 1, amount: 2301.12 })
    expect(lookupHonorarium('large', 211)).toMatchObject({ volunteers: 2, amount: 4602.24 })
    expect(lookupHonorarium('large', 1450)).toMatchObject({ volunteers: 7, amount: 16107.84 })
    expect(lookupHonorarium('large', 1451)).toMatchObject({ volunteers: 8, amount: 18408.96 })
    expect(lookupHonorarium('large', 2000)).toMatchObject({ volunteers: 8, amount: 18408.96 })
  })
})
