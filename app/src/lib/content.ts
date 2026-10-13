import raw from '../data/content.en.json'
import type { Content, Module } from './types.ts'

function asContent(value: unknown): Content {
  if (!value || typeof value !== 'object') {
    throw new Error('NSNP content file is empty.')
  }
  return value as Content
}

export const content: Content = asContent(raw)

export function getModule(id: string | undefined): Module | undefined {
  if (!id) return undefined
  return content.modules.find((item) => item.id === id)
}

export function getChecklist(id: string | undefined) {
  if (!id) return undefined
  return content.checklists.find((item) => item.id === id)
}
