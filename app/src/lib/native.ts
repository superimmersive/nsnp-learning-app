export type NativeProbe = {
  Capacitor?: {
    isNativePlatform?: () => boolean
    getPlatform?: () => string
  }
  androidBridge?: unknown
  webkit?: { messageHandlers?: { bridge?: unknown } }
}

function probe(scope?: NativeProbe): NativeProbe | undefined {
  if (scope) return scope
  if (typeof window === 'undefined') return undefined
  return window as NativeProbe
}

/** True inside the Capacitor Android or iOS shell. The website stays false. */
export function isNativeApp(scope?: NativeProbe): boolean {
  return nativePlatform(scope) !== 'web'
}

export function nativePlatform(scope?: NativeProbe): 'android' | 'ios' | 'web' {
  const current = probe(scope)
  if (!current) return 'web'
  try {
    const named = current.Capacitor?.getPlatform?.()
    if (named === 'android' || named === 'ios') return named
    if (current.Capacitor?.isNativePlatform?.()) {
      return current.androidBridge ? 'android' : 'ios'
    }
  } catch {
    return 'web'
  }
  if (current.androidBridge) return 'android'
  if (current.webkit?.messageHandlers?.bridge) return 'ios'
  return 'web'
}

const NAVY = '#0b2545'

/** Status bar and splash for the installed app. No-op in a browser. */
export async function prepareNativeShell(): Promise<void> {
  const platform = nativePlatform()
  if (platform === 'web') return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: NAVY })
      await StatusBar.setOverlaysWebView({ overlay: false })
    }
  } catch {
    // A missing status-bar plugin must not stop the lessons.
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    // The native splash hides on its own when this plugin is unavailable.
  }
}
