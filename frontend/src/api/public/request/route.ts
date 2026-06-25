import { prisma } from '@/lib/prisma'
import { err, ok } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'
import { normalizePlate } from '@/lib/plate'
import { isPlanActive, canAddVehicle, getVehicleLimit } from "@/lib/plans"

export async function POST(req: Request) {
  const { shopId, phone: rawPhone, plateNumber: rawPlate, customerName, vehicleTypeId, packageId } = await req.json()
  if (!shopId || !rawPhone || !rawPlate || !vehicleTypeId) return err('shopId, phone, plate, vehicleTypeId required')

  const phone = normalizePhone(rawPhone)
  const plateNumber = normalizePlate(rawPlate)

  const centre = await prisma.washCentre.findUnique({ where: { id: shopId }, select: { id: true, name: true, plan: true, planExpiresAt: true, active: true, freeLimit: true, logoImage: true, themeColor: true } })
  if (!centre) return err('Centre not found', 404)
  if (!isPlanActive(centre)) return err('This wash centre is currently inactive.', 403)

  // 15-min cooldown per vehicle
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000)
  const existing = await prisma.washRequest.findFirst({ where: { shopId, plateNumber, status: 'pending', createdAt: { gte: fifteenMinsAgo } } })
  if (existing) return ok({ alreadyPending: true })

  // Check customer limit
  const existingCustomer = await prisma.customer.findUnique({ where: { phone_shopId: { phone, shopId } } })
  if (!existingCustomer) {
    const count = await prisma.customer.count({ where: { shopId } })
    if (!canAddVehicle(centre, count)) return err(`Customer limit of ${getVehicleLimit(centre)} reached.`, 403)
  }

  // Get current wash count for this vehicle
  const vehicle = await prisma.vehicle.findUnique({ where: { plateNumber_shopId: { plateNumber, shopId } } })
  const vehicleType = await prisma.vehicleType.findFirst({ where: { id: vehicleTypeId, shopId } })

  const activeStamps = vehicle ? await prisma.washSession.count({ where: { vehicleId: vehicle.id, redeemed: false } }) : 0

  const request = await prisma.washRequest.create({ data: { shopId, phone, plateNumber, customerName: customerName?.trim() || null, vehicleTypeId, packageId: packageId || null, status: 'pending' } })

  return ok({ alreadyPending: false, requestId: request.id, phone, plateNumber, activeStamps, washGoal: vehicleType?.washGoal || 8, centreName: centre.name, logoImage: centre.logoImage, themeColor: centre.themeColor || '#0ea5e9' })
}
