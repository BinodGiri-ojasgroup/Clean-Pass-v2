import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'
import { normalizePlate } from '@/lib/plate'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawPhone = searchParams.get('phone')
  const rawPlate = searchParams.get('plateNo')
  const shopId = searchParams.get('shopId')
  if (!rawPhone || !rawPlate || !shopId) return err('phone, plateNo and shopId required')

  const phone = normalizePhone(rawPhone)
  const plateNo = normalizePlate(rawPlate)

  const request = await prisma.washRequest.findFirst({
    where: { phone, plateNo, shopId },
    orderBy: { createdAt: 'desc' }
  })
  if (!request) return ok({ status: 'pending' })
  if (request.status === 'pending') return ok({ status: 'pending' })
  if (request.status === 'rejected') return ok({ status: 'rejected' })

  const vehicle = await prisma.vehicle.findUnique({ where: { plateNo_shopId: { plateNo, shopId } }, include: { vehicleType: true } })
  if (!vehicle) return ok({ status: 'approved', activeWashes: 1, washGoal: 8, isRewardReady: false })

  const activeWashes = await prisma.wash.count({ where: { vehicleId: vehicle.id, shopId, redeemed: false } })
  const isRewardReady = activeWashes >= vehicle.vehicleType.washGoal

  return ok({ status: 'approved', activeWashes, washGoal: vehicle.vehicleType.washGoal, isRewardReady, vehicleTypeName: vehicle.vehicleType.name, vehicleTypeIcon: vehicle.vehicleType.icon })
}
