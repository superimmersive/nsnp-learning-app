export type SmsProviderName = "console" | "local-sa" | "twilio"

export function smsProviderName(value: string | undefined): SmsProviderName {
  if (value === "local-sa" || value === "twilio") return value
  return "console"
}

/** Console logs the code. The other two names are stubs and do not call a network. */
export function deliverSms(provider: SmsProviderName, to: string, code: string): void {
  if (provider === "console") {
    console.info(`[sms:console] to ${to}: NSNP trial code ${code}`)
    return
  }
  if (provider === "local-sa") {
    throw new Error("Local SA SMS is a stub. Set SMS_PROVIDER=console until a gateway account exists.")
  }
  throw new Error("Twilio is a stub. Set SMS_PROVIDER=console until an account exists.")
}

export function revealCode(provider: SmsProviderName, fixedOtp: string | undefined): boolean {
  return provider === "console" || Boolean(fixedOtp)
}
