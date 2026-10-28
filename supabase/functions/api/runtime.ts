/**
 * Session pepper. An environment value wins. A blank value is treated as unset
 * so the function can read Supabase Vault. Empty means neither is available.
 */
export function resolveSessionSecret(envValue: string | undefined, vaultValue: unknown): string {
  const fromEnv = envValue?.trim() ?? ""
  if (fromEnv) return fromEnv
  return typeof vaultValue === "string" ? vaultValue.trim() : ""
}

/**
 * SMS settings. A non-blank environment value wins. Otherwise the private
 * config table is used. A blank result means that setting is off.
 */
export function resolveSms(
  env: { provider?: string; otp?: string },
  table: { provider?: string; otp?: string },
): { provider: string; otp: string } {
  const provider = env.provider?.trim() ? env.provider.trim() : (table.provider?.trim() ?? "")
  const otp = env.otp?.trim() ? env.otp.trim() : (table.otp?.trim() ?? "")
  return { provider, otp }
}

export function configRows(rows: Array<{ name?: string; value?: string }> | null): { provider?: string; otp?: string } {
  const table: { provider?: string; otp?: string } = {}
  for (const row of rows ?? []) {
    if (row.name === "SMS_PROVIDER") table.provider = row.value
    if (row.name === "DEV_FIXED_OTP") table.otp = row.value
  }
  return table
}
