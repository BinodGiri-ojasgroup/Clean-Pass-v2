import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const packages = await prisma.washPackage.findMany({ where: { shopId: session.shopId }, include: { vehicleType: true }, orderBy: { createdAt: 'asc' } })
  return ok(packages)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { name, description, price, stampValue, color, vehicleTypeId } = await req.json()
  if (!name?.trim() || !price) return err('Name and price required')
  const pkg = await prisma.washPackage.create({ data: { shopId: session.shopId, name: name.trim(), description: description?.trim() || null, price: Number(price), stampValue: Number(stampValue) || 1, color: color || '#0ea5e9', vehicleTypeId: vehicleTypeId || null } })
  return ok(pkg)
}
