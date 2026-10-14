import { describe, expect, it } from 'vitest'
import { routerBasename, siteBase } from './site-base.ts'

describe('site base path', () => {
  it('uses the site root when Pages does not set a path', () => {
    expect(siteBase(undefined)).toBe('/')
    expect(siteBase('')).toBe('/')
    expect(siteBase('/')).toBe('/')
    expect(siteBase('  /  ')).toBe('/')
  })

  it('normalizes the GitHub Pages project path', () => {
    expect(siteBase('/nsnp-learning-app')).toBe('/nsnp-learning-app/')
    expect(siteBase('nsnp-learning-app')).toBe('/nsnp-learning-app/')
    expect(siteBase('/nsnp-learning-app/')).toBe('/nsnp-learning-app/')
  })

  it('gives the router a basename that works on Pages and inside the app', () => {
    expect(routerBasename('/nsnp-learning-app/')).toBe('/nsnp-learning-app')
    expect(routerBasename('/')).toBe('')
    expect(routerBasename('')).toBe('')
  })
})
