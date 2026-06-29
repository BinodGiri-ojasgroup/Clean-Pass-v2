export function normalizePhone(phone: string): string {
  let x = phone.replace(/[\s\-().]/g, '').trim()
  if (x.startsWith('+')) x = x.slice(1)
  if (x.startsWith('977')) x = x.slice(3)
  if (x.startsWith('0')) x = x.slice(1)
  return x
}

export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  // Format for Nepali numbers: 98XXXXXXXX → 98 XXXX XXXX
  if (normalized.length === 10 && normalized.startsWith('9')) {
    return `${normalized.slice(0, 2)} ${normalized.slice(2, 6)} ${normalized.slice(6)}`
  }
  return normalized
}

export function isValidNepaliPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  // Must be 10 digits, start with 9 (Nepali mobile numbers)
  return normalized.length === 10 && normalized.startsWith('9')
}
