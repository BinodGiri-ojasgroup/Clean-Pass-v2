import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  const vehicles = await prisma.vehicle.findMany({
    where: {
      shopId: session.shopId,
      ...(search ? { OR: [
        { plateNo: { contains: search, mode: 'insensitive' } },
        { customer: { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ]}}
      ]} : {})
    },
    include: {
      customer: true,
      vehicleType: true,
      washes: { where: { status: 'done' } },
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(vehicles.map(v => ({
    id: v.id, plateNo: v.plateNo, make: v.make, color: v.color,
    vehicleType: { id: v.vehicleType.id, name: v.vehicleType.name, icon: v.vehicleType.icon, washGoal: v.vehicleType.washGoal },
    customer: { id: v.customer.id, name: v.customer.name, phone: v.customer.phone },
    activeWashes: v.washes.filter(w => !w.redeemed).length,
    unpaidWashes: v.washes.filter(w => !w.paid && !w.redeemed).length,
    isRewardReady: v.washes.filter(w => !w.redeemed).length >= v.vehicleType.washGoal,
    createdAt: v.createdAt
  })))
}
