import { prisma } from '@/lib/prisma'
import { err, ok } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'
import { normalizePlate } from '@/lib/plate'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const centreId = searchParams.get('centreId')
  const rawPhone = searchParams.get('phone')
  const rawPlate = searchParams.get('plate')
  if (!centreId || (!rawPhone && !rawPlate)) return err('centreId and phone or plate required')

  const centre = await prisma.washCentre.findUnique({ where: { id: centreId }, select: { name: true, themeColor: true, logoImage: true } })
  if (!centre) return err('Centre not found', 404)

  if (rawPlate) {
    const plateNumber = normalizePlate(rawPlate)
    const vehicle = await prisma.vehicle.findUnique({ where: { plateNumber_centreId: { plateNumber, centreId } }, include: { customer: true, vehicleType: true, washSessions: { include: { package: true }, orderBy: { createdAt: 'desc' }, take: 15 } } })
    if (!vehicle) return ok({ exists: false, centreName: centre.name })
    const activeStamps = vehicle.washSessions.filter(s => !s.redeemed).length
    return ok({ exists: true, vehicle: { ...vehicle, activeStamps }, centreName: centre.name, themeColor: centre.themeColor, logoImage: centre.logoImage })
  }

  const phone = normalizePhone(rawPhone!)
  const customer = await prisma.customer.findUnique({ where: { phone_centreId: { phone, centreId } }, include: { vehicles: { include: { vehicleType: true, washSessions: { where: { redeemed: false }, select: { id: true } } } } } })
  if (!customer) return ok({ exists: false, centreName: centre.name })
  return ok({ exists: true, customer: { ...customer, vehicles: customer.vehicles.map(v => ({ ...v, activeStamps: v.washSessions.length })) }, centreName: centre.name, themeColor: centre.themeColor })
}
