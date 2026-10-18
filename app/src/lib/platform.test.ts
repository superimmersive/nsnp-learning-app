import { describe, expect, it } from 'vitest'
import { isNativeBuild, webBasename } from './platform.ts'

describe('native build mode', () => {
  it('is only the native vite mode', () => {
    expect(isNativeBuild('native')).toBe(true)
    expect(isNativeBuild('production')).toBe(false)
    expect(isNativeBuild('development')).toBe(false)
  })

  it('keeps the GitHub Pages subpath and drops the trailing slash', () => {
    expect(webBasename('/nsnp-learning/')).toBe('/nsnp-learning')
    expect(webBasename('/')).toBe('')
  })
})
