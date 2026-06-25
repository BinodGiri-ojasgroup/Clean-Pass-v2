import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { err, ok } from '@/lib/api'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { vehicleId, packageId, amountCharged, paymentStatus, amountPaid, notes } = await req.json()
  if (!vehicleId) return err('vehicleId required')

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, centreId: session.centreId }, include: { vehicleType: true } })
  if (!vehicle) return err('Vehicle not found', 404)

  const pkg = packageId ? await prisma.washPackage.findFirst({ where: { id: packageId, centreId: session.centreId } }) : null
  const stampValue = pkg?.stampValue || 1
  const charged = Number(amountCharged) || pkg?.price || 0
  const paid = Number(amountPaid) || (paymentStatus === 'paid' ? charged : 0)

  const session_ = await prisma.washSession.create({
    data: { centreId: session.centreId, vehicleId, packageId: packageId || null, stampValue, amountCharged: charged, paymentStatus: paymentStatus || 'paid', amountPaid: paid, notes: notes?.trim() || null }
  })

  // Update vehicle stamp count and totals
  const activeStamps = await prisma.washSession.count({ where: { vehicleId, redeemed: false } })
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { stampCount: activeStamps, totalWashes: { increment: 1 } } })

  // Update customer payment totals
  const unpaidAmount = charged - paid
  await prisma.customer.update({ where: { id: vehicle.customerId }, data: { totalPaid: { increment: paid }, totalUnpaid: { increment: Math.max(0, unpaidAmount) } } })

  const isRewardReady = activeStamps >= vehicle.vehicleType.washGoal

  return ok({ session: session_, activeStamps, washGoal: vehicle.vehicleType.washGoal, isRewardReady }, 201)
}
