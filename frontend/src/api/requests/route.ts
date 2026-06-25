import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const requests = await prisma.washRequest.findMany({
    where: { shopId: session.shopId, status: 'pending' },
    include: { package: true },
    orderBy: { createdAt: 'asc' }
  })
  const shop = await prisma.shop.findUnique({ where: { id: session.shopId }, select: { vehicleTypes: { where: { active: true } }, packages: { where: { active: true } } } })
  return ok({ requests, vehicleTypes: shop?.vehicleTypes || [], packages: shop?.packages || [] })
}
