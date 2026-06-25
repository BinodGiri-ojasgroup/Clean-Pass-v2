import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const washes = await prisma.wash.findMany({
    where: { shopId: session.shopId, status: { in: ['queued', 'washing'] } },
    include: {
      vehicle: { include: { vehicleType: true, customer: true } },
      package: true,
      worker: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  return ok(washes.map(w => ({
    id: w.id,
    status: w.status,
    createdAt: w.createdAt,
    washStartAt: w.washStartAt,
    paid: w.paid,
    paymentMethod: w.paymentMethod,
    plateNo: w.vehicle.plateNo,
    vehicleType: { name: w.vehicle.vehicleType.name, icon: w.vehicle.vehicleType.icon },
    customerName: w.vehicle.customer.name,
    customerPhone: w.vehicle.customer.phone,
    packageName: w.package?.name,
    packagePrice: w.package?.price,
    packageColor: w.package?.color,
    worker: w.worker,
    notes: w.notes,
  })))
}
