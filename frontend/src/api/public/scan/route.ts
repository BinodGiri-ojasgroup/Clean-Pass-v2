import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const shopId = searchParams.get('shopId')
  if (!shopId) return err('shopId required')
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true, address: true, shopLogo: true, themeColor: true, active: true,
      vehicleTypes: { where: { active: true }, select: { id: true, name: true, icon: true, washGoal: true } },
      packages: { where: { active: true }, select: { id: true, name: true, description: true, price: true, stampValue: true, color: true, vehicleTypeId: true } }
    }
  })
  if (!shop || !shop.active) return err('Wash station not found', 404)
  return ok(shop)
}
