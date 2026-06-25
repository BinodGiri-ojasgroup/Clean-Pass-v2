import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'
import { normalizePlate } from '@/lib/plate'
import { canAddVehicle, getVehicleLimit, isPlanActive } from '@/lib/plans'

export async function POST(req: Request) {
  const { shopId, phone: rawPhone, name, plateNo: rawPlate, vehicleTypeId, packageId } = await req.json()
  if (!shopId || !rawPhone?.trim() || !rawPlate?.trim() || !vehicleTypeId) return err('shopId, phone, plateNo and vehicleTypeId required')

  const phone = normalizePhone(rawPhone)
  const plateNo = normalizePlate(rawPlate)

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true, plan: true, planExpiresAt: true, active: true, freeLimit: true, smsEnabled: true, smsApiKey: true, smsSenderId: true }
  })
  if (!shop || !shop.active) return err('Wash station not found', 404)
  if (!isPlanActive(shop)) return err('This wash station is currently inactive', 403)

  // Cooldown check
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  const pending = await prisma.washRequest.findFirst({
    where: { shopId, plateNo, status: 'pending', createdAt: { gte: fiveMinAgo } }
  })
  if (pending) return ok({ alreadyPending: true, message: 'You already have a pending request.' })

  // Vehicle limit check for new vehicles
  const existingVehicle = await prisma.vehicle.findUnique({ where: { plateNo_shopId: { plateNo, shopId } } })
  if (!existingVehicle) {
    const count = await prisma.vehicle.count({ where: { shopId } })
    if (!canAddVehicle(shop, count)) return err(`Limit of ${getVehicleLimit(shop)} vehicles reached.`, 403)
  }

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where: { phone_shopId: { phone, shopId } },
    update: name?.trim() ? { name: name.trim() } : {},
    create: { phone, name: name?.trim() || null, shopId }
  })

  // Upsert vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNo_shopId: { plateNo, shopId } },
    update: {},
    create: { plateNo, shopId, customerId: customer.id, vehicleTypeId }
  })

  // Create request
  await prisma.washRequest.create({
    data: { shopId, phone, plateNo, vehicleTypeId, packageId: packageId || null, customerId: customer.id, vehicleId: vehicle.id, status: 'pending' }
  })

  const activeWashes = await prisma.wash.count({ where: { vehicleId: vehicle.id, shopId, redeemed: false } })
  const vehicleType = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId }, select: { washGoal: true, name: true, icon: true } })

  return ok({
    alreadyPending: false,
    customer: { name: customer.name, phone: customer.phone },
    vehicle: { plateNo: vehicle.id, plate: plateNo, vehicleTypeId },
    activeWashes,
    washGoal: vehicleType?.washGoal ?? 8,
    vehicleTypeName: vehicleType?.name,
    vehicleTypeIcon: vehicleType?.icon,
  })
}
