import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, shopId: session.shopId },
    include: {
      customer: true,
      vehicleType: true,
      washes: { where: { status: 'done' }, orderBy: { createdAt: 'desc' }, take: 50, include: { package: true, worker: { select: { name: true } } } }
    }
  })
  if (!vehicle) return err('Not found', 404)
  const activeWashes = vehicle.washes.filter(w => !w.redeemed).length
  const unpaidWashes = vehicle.washes.filter(w => !w.paid && !w.redeemed)
  return ok({
    ...vehicle,
    activeWashes,
    unpaidCount: unpaidWashes.length,
    unpaidAmount: unpaidWashes.reduce((s, w) => s + (w.package?.price || 0), 0),
    isRewardReady: activeWashes >= vehicle.vehicleType.washGoal
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const { action, targetCount, paid, washId, paymentMethod } = await req.json()

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, shopId: session.shopId },
    include: { vehicleType: true }
  })
  if (!vehicle) return err('Not found', 404)

  if (action === 'remove') {
    const last = await prisma.wash.findFirst({ where: { vehicleId: id, shopId: session.shopId, redeemed: false, status: 'done' }, orderBy: { createdAt: 'desc' } })
    if (!last) return err('No washes to remove')
    await prisma.wash.delete({ where: { id: last.id } })
  } else if (action === 'add') {
    await prisma.wash.create({ data: { shopId: session.shopId, vehicleId: id, paid: paid ?? true, status: 'done', washDoneAt: new Date() } })
  } else if (action === 'set') {
    const current = await prisma.wash.findMany({ where: { vehicleId: id, shopId: session.shopId, redeemed: false, status: 'done' }, orderBy: { createdAt: 'desc' } })
    const diff = (targetCount ?? 0) - current.length
    if (diff > 0) {
      await prisma.wash.createMany({ data: Array.from({ length: diff }).map(() => ({ shopId: session.shopId, vehicleId: id, paid: true, status: 'done', washDoneAt: new Date() })) })
    } else if (diff < 0) {
      await prisma.wash.deleteMany({ where: { id: { in: current.slice(0, Math.abs(diff)).map(w => w.id) } } })
    }
  } else if (action === 'mark_paid') {
    // Mark a specific wash as paid (customer pays later)
    if (!washId) return err('washId required')
    await prisma.wash.updateMany({
      where: { id: washId, shopId: session.shopId },
      data: { paid: true, paymentMethod: paymentMethod || 'cash' }
    })
  } else if (action === 'mark_all_paid') {
    // Mark ALL unpaid washes for this vehicle as paid
    await prisma.wash.updateMany({
      where: { vehicleId: id, shopId: session.shopId, paid: false, redeemed: false },
      data: { paid: true, paymentMethod: paymentMethod || 'cash' }
    })
  }

  const newCount = await prisma.wash.count({ where: { vehicleId: id, shopId: session.shopId, redeemed: false, status: 'done' } })
  const unpaidWashes = await prisma.wash.findMany({ where: { vehicleId: id, shopId: session.shopId, paid: false, redeemed: false }, include: { package: true } })
  return ok({
    activeWashes: newCount,
    washGoal: vehicle.vehicleType.washGoal,
    isRewardReady: newCount >= vehicle.vehicleType.washGoal,
    unpaidCount: unpaidWashes.length,
    unpaidAmount: unpaidWashes.reduce((s, w) => s + (w.package?.price || 0), 0)
  })
}
