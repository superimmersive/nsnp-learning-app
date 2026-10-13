import type { MealUnit } from './types.ts'

export function formatRand(amount: number): string {
  const negative = amount < 0
  const [whole, cents] = Math.abs(amount).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}R${grouped}.${cents}`
}

export function trimNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

export function formatMeasured(value: number, unit: MealUnit): string {
  if (unit === 'kg') return `${trimNumber(value)} kg`
  const count = Math.round(value)
  if (unit === 'tins') return `${count} ${count === 1 ? 'tin' : 'tins'}`
  if (unit === 'sachets') return `${count} ${count === 1 ? 'sachet' : 'sachets'}`
  return `${count} fruit`
}

export function formatLongDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function groupDigits(value: number): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function bandLabel(min: number, max: number | null, andAbove: string): string {
  if (max == null) return `${groupDigits(min)} ${andAbove}`
  return `${groupDigits(min)}–${groupDigits(max)}`
}
