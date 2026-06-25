interface Shop { plan: string; planExpiresAt: Date | null; freeLimit: number }

export function isPlanActive(shop: Shop): boolean {
  if (shop.plan === 'free') return true
  if (!shop.planExpiresAt) return false
  return new Date(shop.planExpiresAt) > new Date()
}

export function getVehicleLimit(shop: Shop): number {
  if (shop.plan === 'free') return shop.freeLimit ?? 50
  return Infinity
}

export function canAddVehicle(shop: Shop, currentCount: number): boolean {
  if (shop.plan !== 'free') return true
  return currentCount < (shop.freeLimit ?? 50)
}
