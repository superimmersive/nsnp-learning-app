/** Vite mode for `npm run build:native`. The web build stays on `production`. */
export const NATIVE_MODE = 'native'

export function isNativeBuild(mode: string): boolean {
  return mode === NATIVE_MODE
}

/**
 * Basename for the GitHub Pages / local web app.
 * `import.meta.env.BASE_URL` is always `/` or a subpath with a trailing slash.
 */
export function webBasename(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}
