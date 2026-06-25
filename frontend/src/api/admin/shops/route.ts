// app/api/admin/shops/route.ts
import { prisma } from '@/lib/prisma'
import { err, ok } from '@/lib/api'
import { headers } from 'next/headers'

async function verifyAdmin(req?: Request) {
  const validPin = process.env.ADMIN_PIN || 'brewpass2024'
  const h = await headers()
  const headerPin = h.get('x-admin-pin')
  if (headerPin === validPin) return true
  if (req) {
    const { searchParams } = new URL(req.url)
    if (searchParams.get('pin') === validPin) return true
  }
  return false
}

export async function GET(req: Request) {
  if (!await verifyAdmin(req)) return err('Unauthorized', 401)
  const shops = await prisma.shop.findMany({
    select: {
      id: true, name: true, email: true, address: true, phone: true,
      plan: true, planExpiresAt: true, active: true,
      freeLimit: true, themeColor: true, createdAt: true,
      _count: { select: { customers: true, vehicles: true, washRequests: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return ok(shops)
}

export async function PATCH(req: Request) {
  if (!await verifyAdmin(req)) return err('Unauthorized', 401)
  const { shopId, plan, active, planExpiresAt, freeLimit, themeColor } = await req.json()
  if (!shopId) return err('shopId required')
  const data: Record<string, unknown> = {}
  if (plan !== undefined) data.plan = plan
  if (active !== undefined) data.active = active
  if (planExpiresAt !== undefined) data.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null
  if (freeLimit !== undefined) data.freeLimit = Number(freeLimit)
  if (themeColor !== undefined) data.themeColor = themeColor
  const shop = await prisma.shop.update({
    where: { id: shopId }, data,
    select: { id: true, name: true, plan: true, active: true, planExpiresAt: true, freeLimit: true }
  })
  return ok(shop)
}
