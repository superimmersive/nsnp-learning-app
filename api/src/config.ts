export type Config = {
  databaseUrl: string
  databaseAppUrl: string
  port: number
  smsProvider: 'console' | 'local-sa' | 'twilio'
  smsPepper: string
  tokenPepper: string
  pinPepper: string
  trialDistrictName: string
  otpMinutes: number
  joinCodeDays: number
  sessionDays: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = required(env, 'DATABASE_URL')
  return {
    databaseUrl,
    databaseAppUrl: env.DATABASE_APP_URL?.trim() || databaseUrl,
    port: Number(env.PORT ?? 8787),
    smsProvider: parseProvider(env.SMS_PROVIDER),
    smsPepper: env.SMS_PEPPER?.trim() || 'local-dev-sms-pepper',
    tokenPepper: env.TOKEN_PEPPER?.trim() || 'local-dev-token-pepper',
    pinPepper: env.PIN_PEPPER?.trim() || 'local-dev-pin-pepper',
    trialDistrictName: env.TRIAL_DISTRICT_NAME?.trim() || 'Eden and Central Karoo Education District',
    otpMinutes: Number(env.OTP_MINUTES ?? 10),
    joinCodeDays: Number(env.JOIN_CODE_DAYS ?? 14),
    sessionDays: Number(env.SESSION_DAYS ?? 30),
  }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}. Copy api/.env.example and fill in local values.`)
  return value
}

function parseProvider(value: string | undefined): Config['smsProvider'] {
  if (!value || value === 'console') return 'console'
  if (value === 'local-sa' || value === 'twilio') return value
  throw new Error('SMS_PROVIDER must be console, local-sa, or twilio')
}
