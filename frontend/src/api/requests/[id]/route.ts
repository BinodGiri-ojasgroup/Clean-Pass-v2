import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { canAddVehicle, getVehicleLimit } from '@/lib/plans'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const { action, packageId, paid } = await req.json()
  if (!['approve', 'reject'].includes(action)) return err('Invalid action')

  const request = await prisma.washRequest.findFirst({ where: { id, shopId: session.shopId, status: 'pending' } })
  if (!request) return err('Request not found or already resolved', 404)

  if (action === 'reject') {
    await prisma.washRequest.update({ where: { id }, data: { status: 'rejected', resolvedAt: new Date() } })
    return ok({ message: 'Request rejected' })
  }

  const shop = await prisma.shop.findUnique({ where: { id: session.shopId } })
  if (!shop) return err('Shop not found', 404)

  const customer = await prisma.customer.upsert({
    where: { phone_shopId: { phone: request.phone, shopId: session.shopId } },
    update: {},
    create: { phone: request.phone, shopId: session.shopId }
  })

  const existingVehicle = await prisma.vehicle.findUnique({ where: { plateNo_shopId: { plateNo: request.plateNo, shopId: session.shopId } } })
  if (!existingVehicle) {
    const count = await prisma.vehicle.count({ where: { shopId: session.shopId } })
    if (!canAddVehicle(shop, count)) {
      await prisma.washRequest.update({ where: { id }, data: { status: 'rejected', resolvedAt: new Date() } })
      return err(`Vehicle limit of ${getVehicleLimit(shop)} reached`, 403)
    }
  }

  const vehicleTypeId = request.vehicleTypeId || (await prisma.vehicleType.findFirst({ where: { shopId: session.shopId, active: true } }))?.id
  if (!vehicleTypeId) return err('No vehicle type found', 400)

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNo_shopId: { plateNo: request.plateNo, shopId: session.shopId } },
    update: {},
    create: { plateNo: request.plateNo, shopId: session.shopId, customerId: customer.id, vehicleTypeId }
  })

  const finalPackageId = packageId || request.packageId
  const isPaid = paid !== undefined ? paid : true
  const pkg = finalPackageId ? await prisma.washPackage.findUnique({ where: { id: finalPackageId } }) : null
  const stampValue = pkg?.stampValue ?? 1
  const vehicleType = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } })
  const washGoal = vehicleType?.washGoal ?? 8

  // Auto-redeem completed card
  const currentActive = await prisma.wash.count({ where: { vehicleId: vehicle.id, shopId: session.shopId, redeemed: false, status: 'done' } })
  if (currentActive >= washGoal) {
    const toRedeem = await prisma.wash.findMany({ where: { vehicleId: vehicle.id, shopId: session.shopId, redeemed: false, status: 'done' }, take: washGoal, orderBy: { createdAt: 'asc' } })
    await prisma.wash.updateMany({ where: { id: { in: toRedeem.map(w => w.id) } }, data: { redeemed: true, redeemedAt: new Date() } })
  }

  // Create wash records with status='queued' — goes into the queue board
  for (let i = 0; i < stampValue; i++) {
    await prisma.wash.create({ data: { shopId: session.shopId, vehicleId: vehicle.id, packageId: finalPackageId || null, paid: isPaid, status: 'queued' } })
  }

  await prisma.washRequest.update({ where: { id }, data: { status: 'approved', resolvedAt: new Date(), customerId: customer.id, vehicleId: vehicle.id } })

  const activeWashes = await prisma.wash.count({ where: { vehicleId: vehicle.id, shopId: session.shopId, redeemed: false, status: 'done' } })

  return ok({ message: 'Approved — added to queue', vehicle: { plateNo: request.plateNo }, activeWashes, washGoal, isRewardReady: activeWashes >= washGoal, paid: isPaid })
}
