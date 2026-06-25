import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const workers = await prisma.worker.findMany({
    where: { shopId: session.shopId, active: true },
    include: {
      washes: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, include: { package: true } },
      shifts: { where: { clockIn: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }
    },
    orderBy: { createdAt: 'asc' }
  })
  return ok(workers.map(w => ({
    id: w.id, name: w.name, phone: w.phone, pin: w.pin, commission: w.commission,
    washesThisMonth: w.washes.length,
    revenueThisMonth: w.washes.reduce((s, wash) => s + (wash.package?.price || 0), 0),
    commissionEarned: w.washes.length * w.commission,
    activeShift: w.shifts.find(s => !s.clockOut) || null,
    shiftsThisWeek: w.shifts.length,
  })))
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { name, phone, pin, commission } = await req.json()
  if (!name?.trim()) return err('Name required')
  const worker = await prisma.worker.create({
    data: { shopId: session.shopId, name: name.trim(), phone: phone?.trim() || null, pin: pin || '0000', commission: Number(commission) || 0 }
  })
  return ok(worker)
}
