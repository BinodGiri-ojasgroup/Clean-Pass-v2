import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { workerId, action } = await req.json() // action: 'in' | 'out'

  const worker = await prisma.worker.findFirst({ where: { id: workerId, shopId: session.shopId } })
  if (!worker) return err('Worker not found', 404)

  if (action === 'in') {
    const existing = await prisma.shift.findFirst({ where: { workerId, clockOut: null } })
    if (existing) return err('Worker already clocked in')
    const shift = await prisma.shift.create({ data: { shopId: session.shopId, workerId } })
    return ok(shift)
  } else {
    const shift = await prisma.shift.findFirst({ where: { workerId, clockOut: null }, orderBy: { clockIn: 'desc' } })
    if (!shift) return err('No active shift found')
    const updated = await prisma.shift.update({ where: { id: shift.id }, data: { clockOut: new Date() } })
    return ok(updated)
  }
}
