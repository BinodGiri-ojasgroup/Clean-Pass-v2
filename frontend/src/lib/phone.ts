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

export function normalizePlate(plate: string): string {
  return plate.replace(/\s/g, '').trim()
}

export function formatPlate(plate: string): string {
  const normalized = normalizePlate(plate).toUpperCase()
  if (!normalized) return ''
  
  // Extract sections:
  // First: 2-3 letters
  let part1 = '', part2 = '', part3 = '', part4 = ''
  let index = 0
  
  // Part 1: 2-3 letters
  while (index < normalized.length && /[A-Z]/.test(normalized[index]) && part1.length < 3) {
    part1 += normalized[index]
    index++
  }
  
  // Part 2: 1-2 digits
  while (index < normalized.length && /[0-9]/.test(normalized[index]) && part2.length < 2) {
    part2 += normalized[index]
    index++
  }
  
  // Part 3: 2-3 letters
  while (index < normalized.length && /[A-Z]/.test(normalized[index]) && part3.length < 3) {
    part3 += normalized[index]
    index++
  }
  
  // Part 4: 1-4 digits
  while (index < normalized.length && /[0-9]/.test(normalized[index]) && part4.length < 4) {
    part4 += normalized[index]
    index++
  }
  
  // Build formatted string
  const parts = [part1, part2, part3, part4].filter(p => p.length > 0)
  return parts.join(' ')
}

export function isValidNepaliPlate(plate: string): boolean {
  const normalized = normalizePlate(plate).toUpperCase()
  // Nepali license plate format:
  // 2-3 letters, 1-2 digits, 2-3 letters, 1-4 digits
  // Regex to validate:
  const plateRegex = /^[A-Z]{2,3}[0-9]{1,2}[A-Z]{2,3}[0-9]{1,4}$/
  return plateRegex.test(normalized)
}
