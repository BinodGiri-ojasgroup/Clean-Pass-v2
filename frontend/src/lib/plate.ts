// Normalize Nepal vehicle plate: "ba1pa2345" -> "BA 1 PA 2345"
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, ' ').trim()
}
