import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const types = await prisma.vehicleType.findMany({ where: { shopId: session.shopId, active: true }, orderBy: { createdAt: 'asc' } })
  return ok(types)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { name, icon, washGoal } = await req.json()
  if (!name?.trim()) return err('Name required')
  const vt = await prisma.vehicleType.create({ data: { shopId: session.shopId, name: name.trim(), icon: icon || '🚗', washGoal: Number(washGoal) || 8 } })
  return ok(vt)
}
