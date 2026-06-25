import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const start = new Date(date + 'T00:00:00.000Z')
  const end = new Date(date + 'T23:59:59.999Z')

  const washes = await prisma.wash.findMany({
    where: { shopId: session.shopId, createdAt: { gte: start, lte: end }, status: 'done' },
    include: { package: true, worker: { select: { name: true } } }
  })

  const byMethod: Record<string, { count: number; amount: number }> = {}
  washes.forEach(w => {
    const m = w.paymentMethod || 'cash'
    if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 }
    byMethod[m].count++
    byMethod[m].amount += w.package?.price || 0
  })

  const byWorker: Record<string, { name: string; count: number; commission: number }> = {}
  const workers = await prisma.worker.findMany({ where: { shopId: session.shopId }, select: { id: true, name: true, commission: true } })
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]))

  washes.forEach(w => {
    if (!w.workerId) return
    const worker = workerMap[w.workerId]
    if (!worker) return
    if (!byWorker[w.workerId]) byWorker[w.workerId] = { name: worker.name, count: 0, commission: 0 }
    byWorker[w.workerId].count++
    byWorker[w.workerId].commission += worker.commission
  })

  return ok({
    date,
    totalWashes: washes.length,
    totalRevenue: washes.filter(w => w.paid).reduce((s, w) => s + (w.package?.price || 0), 0),
    totalUnpaid: washes.filter(w => !w.paid).reduce((s, w) => s + (w.package?.price || 0), 0),
    byMethod,
    byWorker: Object.values(byWorker),
    redeemed: washes.filter(w => w.redeemed).length,
  })
}
