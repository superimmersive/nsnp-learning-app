import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto"

export function randomId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`
}

export function randomToken(): string {
  return randomBytes(24).toString("hex")
}

export function hashSecret(value: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex")
}

export function hashPin(pin: string, pepper: string): string {
  const salt = randomBytes(8).toString("hex")
  const hash = scryptSync(`${pepper}:${pin}`, salt, 32).toString("hex")
  return `scrypt:${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string, pepper: string): boolean {
  const [kind, salt, hash] = stored.split(":")
  if (kind !== "scrypt" || !salt || !hash) return false
  const next = scryptSync(`${pepper}:${pin}`, salt, 32)
  const previous = Buffer.from(hash, "hex")
  if (next.length !== previous.length) return false
  return timingSafeEqual(next, previous)
}

export function oneTimeCode(fixed: string | undefined): string {
  if (fixed && /^\d{4,8}$/.test(fixed)) return fixed
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 10 && digits.startsWith("0")) return `+27${digits.slice(1)}`
  if (digits.length === 11 && digits.startsWith("27")) return `+${digits}`
  if (input.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

export function pinProblem(pin: string): string | null {
  if (pin.length !== 4) return "Enter 4 digits."
  if (!/^\d{4}$/.test(pin)) return "Use digits only."
  if (new Set(pin).size === 1) return "Choose a PIN that is not four of the same digit."
  const nums = [...pin].map(Number)
  const steps = nums.slice(1).map((value, index) => value - nums[index]!)
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) {
    return "Choose a PIN that is not 1234 or 4321."
  }
  return null
}
