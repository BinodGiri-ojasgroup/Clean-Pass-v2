// app/api/scan/[shopId]/route.ts — PUBLIC
import { prisma } from '@/lib/prisma'
import { err, ok } from '@/lib/api'

export async function GET(_req: Request, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const now = new Date()

  const [shop, offers] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, address: true, stampGoal: true, reward: true, stampLogo: true, shopLogo: true, themeColor: true }
    }),
    prisma.offer.findMany({
      where: { shopId, active: true, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ])

  if (!shop) return err('Shop not found', 404)
  return ok({ ...shop, offers })
}
