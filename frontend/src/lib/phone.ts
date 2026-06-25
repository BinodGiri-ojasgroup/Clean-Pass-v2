export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, '').trim()
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('977')) p = p.slice(3)
  if (p.startsWith('0')) p = p.slice(1)
  return p
}
