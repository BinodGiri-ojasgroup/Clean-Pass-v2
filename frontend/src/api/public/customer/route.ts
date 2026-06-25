import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'
import { normalizePlate } from '@/lib/plate'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawPhone = searchParams.get('phone')
  const rawPlate = searchParams.get('plateNo')
  const shopId = searchParams.get('shopId')
  if (!shopId) return err('shopId required')

  const phone = rawPhone ? normalizePhone(rawPhone) : null
  const plateNo = rawPlate ? normalizePlate(rawPlate) : null
  if (!phone && !plateNo) return err('phone or plateNo required')

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, themeColor: true } })
  if (!shop) return err('Shop not found', 404)

  // Look up by plate if provided
  if (plateNo) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { plateNo_shopId: { plateNo, shopId } },
      include: {
        vehicleType: true,
        customer: true,
        washes: { orderBy: { createdAt: 'desc' }, take: 20, include: { package: true } }
      }
    })
    if (!vehicle) return ok({ exists: false, shopName: shop.name })
    const activeWashes = vehicle.washes.filter(w => !w.redeemed).length
    const totalWashes = vehicle.washes.length
    const totalRedemptions = vehicle.washes.filter(w => w.redeemed).length
    const unpaidCount = vehicle.washes.filter(w => !w.paid && !w.redeemed).length
    return ok({
      exists: true, shopName: shop.name, themeColor: shop.themeColor,
      customer: { name: vehicle.customer.name, phone: vehicle.customer.phone },
      vehicle: { plateNo, make: vehicle.make, color: vehicle.color },
      vehicleType: { name: vehicle.vehicleType.name, icon: vehicle.vehicleType.icon, washGoal: vehicle.vehicleType.washGoal },
      activeWashes, totalWashes, totalRedemptions, unpaidCount,
      isRewardReady: activeWashes >= vehicle.vehicleType.washGoal,
      history: vehicle.washes.slice(0, 10).map(w => ({ id: w.id, createdAt: w.createdAt, redeemed: w.redeemed, paid: w.paid, packageName: w.package?.name }))
    })
  }

  // Look up all vehicles by phone
  const customer = await prisma.customer.findUnique({ where: { phone_shopId: { phone: phone!, shopId } } })
  if (!customer) return ok({ exists: false, shopName: shop.name })
  const vehicles = await prisma.vehicle.findMany({
    where: { customerId: customer.id, shopId },
    include: { vehicleType: true, washes: { where: { redeemed: false } } }
  })
  return ok({ exists: true, shopName: shop.name, customer: { name: customer.name, phone: customer.phone }, vehicles: vehicles.map(v => ({ id: v.id, plateNo: v.plateNo, vehicleTypeName: v.vehicleType.name, vehicleTypeIcon: v.vehicleType.icon, washGoal: v.vehicleType.washGoal, activeWashes: v.washes.length })) })
}
