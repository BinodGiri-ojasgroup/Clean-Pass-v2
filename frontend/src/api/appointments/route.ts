import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const appts = await prisma.appointment.findMany({
    where: { shopId: session.shopId, ...(date ? { date } : {}) },
    include: { vehicle: { include: { customer: true, vehicleType: true } } },
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
  })
  return ok(appts)
}
