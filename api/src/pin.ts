export function pinProblem(pin: string): string | null {
  if (pin.length !== 4) return 'Enter 4 digits.'
  if (!/^\d{4}$/.test(pin)) return 'Use digits only.'
  if (new Set(pin).size === 1) return 'Choose a PIN that is not four of the same digit.'
  const nums = [...pin].map(Number)
  const steps = nums.slice(1).map((value, index) => value - nums[index])
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) {
    return 'Choose a PIN that is not 1234 or 4321.'
  }
  return null
}
