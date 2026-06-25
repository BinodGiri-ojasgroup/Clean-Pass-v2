import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')
  const days = Number(searchParams.get('days') || 30)

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const washes = await prisma.wash.findMany({
    where: { shopId: session.shopId, createdAt: { gte: since } },
    include: { vehicle: { include: { customer: true, vehicleType: true } }, package: true },
    orderBy: { createdAt: 'desc' }
  })

  if (format === 'csv') {
    const header = 'Date,Plate No,Vehicle Type,Customer,Phone,Package,Price,Paid,Redeemed'
    const rows = washes.map(w => [
      new Date(w.createdAt).toLocaleDateString('en-NP'),
      w.vehicle.plateNo, w.vehicle.vehicleType.name,
      w.vehicle.customer.name || '', w.vehicle.customer.phone,
      w.package?.name || 'Manual', w.package?.price || 0,
      w.paid ? 'Yes' : 'No', w.redeemed ? 'Yes' : 'No'
    ].join(','))
    const csv = [header, ...rows].join('\n')
    return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="cleanpass-report.csv"' } })
  }

  const totalRevenue = washes.filter(w => w.paid).reduce((s, w) => s + (w.package?.price || 0), 0)
  const unpaidRevenue = washes.filter(w => !w.paid && !w.redeemed).reduce((s, w) => s + (w.package?.price || 0), 0)
  return ok({ washes: washes.length, revenue: totalRevenue, unpaid: unpaidRevenue, redemptions: washes.filter(w => w.redeemed).length })
}
