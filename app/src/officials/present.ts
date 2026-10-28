import { cn } from '@/lib/utils'
import type { SchoolTone } from './metrics'
import type { IssueKind } from './types'

export function toneClass(tone: SchoolTone): string {
  if (tone === 'green') return 'bg-good-soft text-good'
  if (tone === 'amber') return 'bg-gold-soft text-gold'
  return 'bg-bad-soft text-bad'
}

export function kindLabel(kind: IssueKind): string {
  switch (kind) {
    case 'delivery':
      return 'Delivery'
    case 'safety':
      return 'Safety'
    case 'forms':
      return 'Forms'
    case 'app':
      return 'The app'
    case 'other':
      return 'Other'
  }
}

/** Selects must not use flex. Flex clips the chosen option on a phone. */
export function selectClass(className?: string) {
  return cn(
    'block h-12 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30',
    className,
  )
}

export function fieldClass(className?: string) {
  return cn(
    'flex h-12 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30',
    className,
  )
}
