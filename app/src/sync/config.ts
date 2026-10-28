function envValue(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>
  return env[name]?.trim() ?? ''
}

/** Empty when the build should keep using the example data in the browser. */
export function apiBase(): string | null {
  const value = envValue('VITE_API_URL')
  return value ? value.replace(/\/$/, '') : null
}

export function officialToken(role: 'district_official' | 'super_admin'): string {
  return role === 'super_admin' ? envValue('VITE_ADMIN_TOKEN') : envValue('VITE_OFFICIAL_TOKEN')
}
