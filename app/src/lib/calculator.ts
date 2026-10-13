import { content } from './content.ts'
import { formatMeasured } from './format.ts'
import type { HonorariumBand, MealItem, MealUnit } from './types.ts'

export type SchoolSize = 'small' | 'large'

export type HonorariumHit = {
  ok: true
  volunteers: number
  amount: number
  min: number
  max: number | null
}

export type HonorariumMiss = {
  ok: false
  reason: 'enter' | 'small-too-high' | 'none'
}

export type EstimateLine = {
  id: string
  name: string
  when: string
  unit: MealUnit
  amount: number
  label: string
}

const PASS_RATIO = 0.8

export function requiredCorrect(total: number): number {
  if (total <= 0) return 0
  return Math.ceil(total * PASS_RATIO)
}

export function isPassingScore(correct: number, total: number): boolean {
  if (total <= 0) return false
  return correct >= requiredCorrect(total)
}

export function scaleMeal(exampleQuantity: number, learners: number, base = content.mealEstimate.baseLearners): number {
  if (!Number.isFinite(learners) || learners <= 0) return 0
  if (!Number.isFinite(exampleQuantity) || base <= 0) return 0
  return (exampleQuantity / base) * learners
}

function lineFor(item: MealItem, learners: number): EstimateLine {
  const amount = scaleMeal(item.quantity, learners)
  return {
    id: item.id,
    name: item.name,
    when: item.when,
    unit: item.unit,
    amount,
    label: formatMeasured(amount, item.unit),
  }
}

export function estimateMeals(breakfastLearners: number, mainLearners: number): EstimateLine[] {
  const breakfast = content.mealEstimate.breakfast.map((item) => lineFor(item, breakfastLearners))
  const main = content.mealEstimate.main.map((item) => lineFor(item, mainLearners))
  return [...breakfast, ...main]
}

function findBand(bands: HonorariumBand[], learnersFed: number): HonorariumBand | undefined {
  return bands.find(
    (band) => learnersFed >= band.min && (band.max == null || learnersFed <= band.max),
  )
}

export function lookupHonorarium(size: SchoolSize, learnersFed: number): HonorariumHit | HonorariumMiss {
  if (!Number.isFinite(learnersFed) || learnersFed < 1) {
    return { ok: false, reason: 'enter' }
  }
  const rounded = Math.floor(learnersFed)
  if (size === 'small' && rounded > 250) {
    return { ok: false, reason: 'small-too-high' }
  }
  const bands = size === 'small' ? content.honorarium.small.bands : content.honorarium.large.bands
  const band = findBand(bands, rounded)
  if (!band) return { ok: false, reason: 'none' }
  return {
    ok: true,
    volunteers: band.volunteers,
    amount: band.amount,
    min: band.min,
    max: band.max,
  }
}
