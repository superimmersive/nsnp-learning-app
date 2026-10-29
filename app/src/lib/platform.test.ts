import { describe, expect, it } from 'vitest'
import { isNativeBuild, showWebHelp, webBasename } from './platform.ts'

describe('native build mode', () => {
  it('is only the native vite mode', () => {
    expect(isNativeBuild('native')).toBe(true)
    expect(isNativeBuild('production')).toBe(false)
    expect(isNativeBuild('development')).toBe(false)
  })

  it('shows trial help on the website and not in the native lesson build', () => {
    expect(showWebHelp('production')).toBe(true)
    expect(showWebHelp('development')).toBe(true)
    expect(showWebHelp('native')).toBe(false)
  })

  it('keeps the GitHub Pages subpath and drops the trailing slash', () => {
    expect(webBasename('/nsnp-learning/')).toBe('/nsnp-learning')
    expect(webBasename('/')).toBe('')
  })
})
