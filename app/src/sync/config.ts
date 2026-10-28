function envValue(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>
  return env[name]?.trim() ?? ''
}

/**
 * Empty for the lesson app: visitors take quizzes with no account, and progress
 * stays in this browser until they join. The native shell never calls the API.
 */
export function apiBase(): string | null {
  if (import.meta.env.MODE === 'native') return null
  const value = envValue('VITE_API_URL')
  return value ? value.replace(/\/$/, '') : null
}
