// app/api/admin/waitlist/route.ts
import { prisma } from '@/lib/prisma'
import { err, ok } from '@/lib/api'
import { headers } from 'next/headers'

async function verifyAdmin(req: Request) {
  const h = await headers()
  const pin = h.get('x-admin-pin')
  const { searchParams } = new URL(req.url)
  const queryPin = searchParams.get('pin')
  const valid = process.env.ADMIN_PIN || 'brewpass2024'
  return pin === valid || queryPin === valid
}

export async function GET(req: Request) {
  if (!await verifyAdmin(req)) return err('Unauthorized', 401)
  const items = await prisma.platformWaitlist.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(items)
}

export async function DELETE(req: Request) {
  if (!await verifyAdmin(req)) return err('Unauthorized', 401)
  const { id } = await req.json()
  await prisma.platformWaitlist.delete({ where: { id } })
  return ok({ deleted: true })
}
