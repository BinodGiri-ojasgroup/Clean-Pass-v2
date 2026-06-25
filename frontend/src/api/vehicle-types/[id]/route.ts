import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const data = await req.json()
  await prisma.vehicleType.updateMany({ where: { id, shopId: session.shopId }, data: { ...data, washGoal: data.washGoal ? Number(data.washGoal) : undefined } })
  return ok({ updated: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  await prisma.vehicleType.updateMany({ where: { id, shopId: session.shopId }, data: { active: false } })
  return ok({ deleted: true })
}
