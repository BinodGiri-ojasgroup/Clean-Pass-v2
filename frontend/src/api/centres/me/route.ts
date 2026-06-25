import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { err, ok } from '@/lib/api'
import { isPlanActive } from '@/lib/plans'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const centre = await prisma.washCentre.findUnique({
    where: { id: session.centreId },
    select: { id: true, name: true, email: true, address: true, phone: true, qrCode: true, plan: true, planExpiresAt: true, active: true, freeLimit: true, logoImage: true, themeColor: true, wifiName: true, wifiPassword: true, wifiType: true, wifiHidden: true, createdAt: true }
  })
  if (!centre) return err('Centre not found', 404)
  return ok({ ...centre, planActive: isPlanActive(centre) })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const body = await req.json()
  const allowed = ['name', 'address', 'phone', 'logoImage', 'themeColor']
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
  const centre = await prisma.washCentre.update({ where: { id: session.centreId }, data })
  return ok(centre)
}
