/** Vite `base` for GitHub Pages (`/nsnp-learning-app/`) or the native shell (`/`). */
export function siteBase(raw: string | undefined): string {
  const value = raw?.trim()
  if (!value || value === '/') return '/'
  const withLeading = value.startsWith('/') ? value : `/${value}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

/**
 * React Router basename.
 * `/` becomes `''` so the native app matches the site root.
 * `/nsnp-learning-app/` stays `/nsnp-learning-app` for GitHub Pages.
 */
export function routerBasename(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') return ''
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}
