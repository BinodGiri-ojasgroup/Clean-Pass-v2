import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'
import { normalizePlate } from '@/lib/plate'

export async function POST(req: Request) {
  const { shopId, phone: rawPhone, plateNo: rawPlate, vehicleTypeId, packageId, date, timeSlot, notes } = await req.json()
  if (!shopId || !rawPhone || !rawPlate || !date || !timeSlot) return err('shopId, phone, plateNo, date and timeSlot required')

  const phone = normalizePhone(rawPhone)
  const plateNo = normalizePlate(rawPlate)

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) return err('Shop not found', 404)

  const customer = await prisma.customer.upsert({ where: { phone_shopId: { phone, shopId } }, update: {}, create: { phone, shopId } })

  const vtId = vehicleTypeId || (await prisma.vehicleType.findFirst({ where: { shopId, active: true } }))?.id
  if (!vtId) return err('No vehicle type found', 400)

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNo_shopId: { plateNo, shopId } },
    update: {},
    create: { plateNo, shopId, customerId: customer.id, vehicleTypeId: vtId }
  })

  // Check slot not already taken
  const existing = await prisma.appointment.findFirst({ where: { shopId, date, timeSlot, status: { not: 'cancelled' } } })
  if (existing) return err('This time slot is already booked. Please choose another time.')

  const appt = await prisma.appointment.create({ data: { shopId, vehicleId: vehicle.id, packageId: packageId || null, date, timeSlot, notes: notes?.trim() || null } })

  return ok({ appointmentId: appt.id, date, timeSlot, plateNo, message: 'Appointment booked successfully!' })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const shopId = searchParams.get('shopId')
  const date = searchParams.get('date')
  if (!shopId || !date) return err('shopId and date required')

  const appts = await prisma.appointment.findMany({
    where: { shopId, date, status: { not: 'cancelled' } },
    select: { timeSlot: true }
  })
  return ok({ bookedSlots: appts.map(a => a.timeSlot) })
}
