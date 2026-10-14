import { describe, expect, it } from 'vitest'
import { isNativeApp, nativePlatform } from './native.ts'

describe('native shell detection', () => {
  it('treats the website as a browser', () => {
    expect(isNativeApp({})).toBe(false)
    expect(nativePlatform(undefined)).toBe('web')
    expect(nativePlatform({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } })).toBe('web')
  })

  it('recognises the Android and iOS bridges', () => {
    expect(nativePlatform({ Capacitor: { getPlatform: () => 'android' } })).toBe('android')
    expect(isNativeApp({ androidBridge: {} })).toBe(true)
    expect(nativePlatform({ webkit: { messageHandlers: { bridge: {} } } })).toBe('ios')
  })
})
