import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { sendSms } from '@/lib/sms'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { id } = await params
  const { status, workerId, paid, paymentMethod, notes } = await req.json()

  const wash = await prisma.wash.findFirst({
    where: { id, shopId: session.shopId },
    include: { vehicle: { include: { customer: true, vehicleType: true } }, package: true }
  })
  if (!wash) return err('Wash not found', 404)

  const update: Record<string, unknown> = {}
  if (status) update.status = status
  if (status === 'washing' && !wash.washStartAt) update.washStartAt = new Date()
  if (status === 'done') {
    update.washDoneAt = new Date()
    // SMS notification when done
    const shop = await prisma.shop.findUnique({ where: { id: session.shopId }, select: { name: true, smsEnabled: true, smsApiKey: true, smsSenderId: true } })
    if (shop?.smsEnabled && shop.smsApiKey && wash.vehicle.customer.phone) {
      const msg = `CleanPass: Your ${wash.vehicle.vehicleType.name} (${wash.vehicle.plateNo}) wash is complete at ${shop.name}. Ready for pickup!`
      sendSms({ to: wash.vehicle.customer.phone, message: msg, apiKey: shop.smsApiKey, senderId: shop.smsSenderId || 'CleanPass' }).catch(() => {})
    }
  }
  if (workerId !== undefined) update.workerId = workerId || null
  if (paid !== undefined) update.paid = paid
  if (paymentMethod !== undefined) update.paymentMethod = paymentMethod
  if (notes !== undefined) update.notes = notes

  const updated = await prisma.wash.update({ where: { id }, data: update })
  return ok(updated)
}
