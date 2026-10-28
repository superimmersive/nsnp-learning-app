export type SmsMessage = {
  to: string
  body: string
}

export type SmsProvider = {
  name: 'console' | 'local-sa' | 'twilio'
  send(message: SmsMessage): Promise<void>
}

/** Prints the text. This is the default so local development needs no account. */
export function consoleSms(): SmsProvider {
  return {
    name: 'console',
    async send(message) {
      console.info(`[sms:console] to ${message.to}: ${message.body}`)
    },
  }
}

/**
 * Stub for a South African gateway. It does not open a network connection.
 * A real gateway would POST to the provider named in LOCAL_SA_SMS_URL.
 */
export function localSaSms(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  return {
    name: 'local-sa',
    async send() {
      if (!env.LOCAL_SA_SMS_URL || !env.LOCAL_SA_SMS_TOKEN) {
        throw new Error('Local SA SMS is not configured. Set LOCAL_SA_SMS_URL and LOCAL_SA_SMS_TOKEN.')
      }
      throw new Error('Local SA SMS gateway is a stub in this build. No message was sent.')
    },
  }
}

/** Stub for Twilio. It does not call Twilio and does not read a real account. */
export function twilioSms(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  return {
    name: 'twilio',
    async send() {
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
        throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.')
      }
      throw new Error('Twilio is a stub in this build. No message was sent.')
    },
  }
}

export function createSmsProvider(name: SmsProvider['name'], env: NodeJS.ProcessEnv = process.env): SmsProvider {
  if (name === 'local-sa') return localSaSms(env)
  if (name === 'twilio') return twilioSms(env)
  return consoleSms()
}
