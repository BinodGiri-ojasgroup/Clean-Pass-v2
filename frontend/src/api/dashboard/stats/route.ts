import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const shopId = session.shopId

  const [totalVehicles, totalWashes, totalRedemptions, pendingRequests, todayWashes, unpaidWashes, upcomingAppts] = await Promise.all([
    prisma.vehicle.count({ where: { shopId } }),
    prisma.wash.count({ where: { shopId, redeemed: false } }),
    prisma.wash.count({ where: { shopId, redeemed: true } }),
    prisma.washRequest.count({ where: { shopId, status: 'pending' } }),
    prisma.wash.count({ where: { shopId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    prisma.wash.count({ where: { shopId, paid: false, redeemed: false } }),
    prisma.appointment.count({ where: { shopId, status: { in: ['pending','confirmed'] }, date: { gte: new Date().toISOString().split('T')[0] } } })
  ])

  // Revenue estimate (last 30 days)
  const recentWashes = await prisma.wash.findMany({
    where: { shopId, paid: true, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    include: { package: true }
  })
  const revenue30d = recentWashes.reduce((sum, w) => sum + (w.package?.price || 0), 0)

  // Last 7 days wash counts
  const days7 = await Promise.all(Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const start = new Date(d.setHours(0,0,0,0))
    const end = new Date(d.setHours(23,59,59,999))
    return prisma.wash.count({ where: { shopId, createdAt: { gte: start, lte: end } } })
      .then(count => ({ date: start.toLocaleDateString('en-NP', { weekday: 'short' }), count }))
  }))

  return ok({ totalVehicles, totalWashes, totalRedemptions, pendingRequests, todayWashes, unpaidWashes, upcomingAppts, revenue30d, days7 })
}
// Already exists — the queue count is included in pendingRequests
