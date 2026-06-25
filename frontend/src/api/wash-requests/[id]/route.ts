import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { err, ok } from '@/lib/api'
import { normalizePlate } from '@/lib/plate'
import { normalizePhone } from '@/lib/phone'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const { action, packageId, paymentStatus, amountPaid } = await req.json()
  if (!['approve', 'reject'].includes(action)) return err('Invalid action')

  const request = await prisma.washRequest.findFirst({ where: { id, centreId: session.centreId, status: 'pending' } })
  if (!request) return err('Request not found', 404)

  if (action === 'reject') {
    await prisma.washRequest.update({ where: { id }, data: { status: 'rejected', resolvedAt: new Date() } })
    return ok({ message: 'Rejected' })
  }

  const phone = normalizePhone(request.phone)
  const plate = normalizePlate(request.plateNumber)

  const centre = await prisma.washCentre.findUnique({ where: { id: session.centreId }, select: { freeLimit: true, plan: true } })

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where: { phone_centreId: { phone, centreId: session.centreId } },
    update: request.customerName ? { name: request.customerName } : {},
    create: { phone, name: request.customerName || null, centreId: session.centreId }
  })

  // Upsert vehicle
  let vehicle = await prisma.vehicle.findUnique({ where: { plateNumber_centreId: { plateNumber: plate, centreId: session.centreId } } })
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: { centreId: session.centreId, customerId: customer.id, vehicleTypeId: request.vehicleTypeId!, plateNumber: plate }
    })
  }

  const vehicleType = await prisma.vehicleType.findUnique({ where: { id: vehicle.vehicleTypeId } })
  if (!vehicleType) return err('Vehicle type not found', 404)

  const pkg = packageId ? await prisma.washPackage.findFirst({ where: { id: packageId, centreId: session.centreId } }) : null
  const stampValue = pkg?.stampValue || 1
  const charged = pkg?.price || 0
  const paid = Number(amountPaid) || (paymentStatus === 'paid' ? charged : 0)

  // Auto-redeem if already at goal
  const currentActive = await prisma.washSession.count({ where: { vehicleId: vehicle.id, redeemed: false } })
  if (currentActive >= vehicleType.washGoal) {
    const toRedeem = await prisma.washSession.findMany({ where: { vehicleId: vehicle.id, redeemed: false }, take: vehicleType.washGoal, orderBy: { createdAt: 'asc' } })
    await prisma.washSession.updateMany({ where: { id: { in: toRedeem.map(s => s.id) } }, data: { redeemed: true, redeemedAt: new Date() } })
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { totalRedeemed: { increment: 1 } } })
  }

  await prisma.washSession.create({ data: { centreId: session.centreId, vehicleId: vehicle.id, packageId: packageId || null, stampValue, amountCharged: charged, paymentStatus: paymentStatus || 'paid', amountPaid: paid } })
  await prisma.vehicle.update({ where: { id: vehicle.id }, data: { totalWashes: { increment: 1 } } })
  await prisma.customer.update({ where: { id: customer.id }, data: { totalPaid: { increment: paid }, totalUnpaid: { increment: Math.max(0, charged - paid) } } })
  await prisma.washRequest.update({ where: { id }, data: { status: 'approved', resolvedAt: new Date(), customerId: customer.id, vehicleId: vehicle.id } })

  const activeStamps = await prisma.washSession.count({ where: { vehicleId: vehicle.id, redeemed: false } })
  const isRewardReady = activeStamps >= vehicleType.washGoal

  return ok({ message: 'Approved', vehicle, customer, activeStamps, washGoal: vehicleType.washGoal, isRewardReady, reward: `1 free ${vehicleType.name} wash` })
}
