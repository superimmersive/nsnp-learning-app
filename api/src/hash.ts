import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

export function randomId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`
}

export function randomToken(): string {
  return randomBytes(24).toString('hex')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashSecret(value: string, pepper: string): string {
  return sha256(`${pepper}:${value}`)
}

export function hashPin(pin: string, pepper: string): string {
  const salt = randomBytes(8).toString('hex')
  const hash = scryptSync(`${pepper}:${pin}`, salt, 32).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string, pepper: string): boolean {
  const [kind, salt, hash] = stored.split(':')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const next = scryptSync(`${pepper}:${pin}`, salt, 32)
  const previous = Buffer.from(hash, 'hex')
  if (next.length !== previous.length) return false
  return timingSafeEqual(next, previous)
}

export function oneTimeCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** 082… and +27… match on the last 9 digits. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) return `+27${digits.slice(1)}`
  if (digits.length === 11 && digits.startsWith('27')) return `+${digits}`
  if (input.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

export function phonesMatch(left: string, right: string): boolean {
  const a = left.replace(/\D/g, '')
  const b = right.replace(/\D/g, '')
  if (a.length < 9 || b.length < 9) return false
  return a.slice(-9) === b.slice(-9)
}

export function maskPhone(cellphone: string): string {
  const digits = cellphone.replace(/\D/g, '')
  return `ending ${digits.slice(-4)}`
}
