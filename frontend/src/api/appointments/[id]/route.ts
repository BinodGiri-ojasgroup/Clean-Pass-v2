import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const { status, notes } = await req.json()
  await prisma.appointment.updateMany({ where: { id, shopId: session.shopId }, data: { ...(status ? { status } : {}), ...(notes !== undefined ? { notes } : {}) } })
  return ok({ updated: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  await prisma.appointment.deleteMany({ where: { id, shopId: session.shopId } })
  return ok({ deleted: true })
}
