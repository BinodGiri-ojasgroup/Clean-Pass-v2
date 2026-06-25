import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { normalizePhone } from '@/lib/phone'

function normPlate(p: string) { return p.toUpperCase().replace(/\s+/g, ' ').trim() }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawPlate = searchParams.get('plateNo')
  const rawPhone = searchParams.get('phone')
  const shopId = searchParams.get('shopId')
  if (!rawPlate) return err('plateNo required')

  const plateNo = normPlate(decodeURIComponent(rawPlate))
  const phone = rawPhone ? normalizePhone(rawPhone) : null

  // Find vehicle
  const vehicle = await prisma.vehicle.findFirst({
    where: shopId ? { plateNo, shopId } : { plateNo },
    include: {
      vehicleType: true,
      customer: true,
      shop: { select: { name: true, themeColor: true, phone: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Check for pending WashRequest even if vehicle doesn't exist yet
  if (!vehicle) {
    // Look for a pending request by phone+plate or plate+shopId
    const pendingReq = shopId ? await prisma.washRequest.findFirst({
      where: { plateNo, shopId, status: 'pending' },
      orderBy: { createdAt: 'desc' }
    }) : null

    if (pendingReq) {
      const shop = await prisma.shop.findUnique({ where: { id: pendingReq.shopId }, select: { name: true, themeColor: true } })
      return ok({
        found: true, plateNo,
        shop: shop ? { name: shop.name, themeColor: shop.themeColor, phone: null } : null,
        activeWash: { status: 'pending_approval', packageName: null, workerName: null, startedAt: null, createdAt: pendingReq.createdAt.toISOString() },
        queuePosition: null,
        recentWashes: [],
        activeStamps: 0, washGoal: 8, isRewardReady: false,
      })
    }
    return ok({ found: false, plateNo })
  }

  // Check for pending WashRequest (submitted but not yet approved)
  const pendingRequest = await prisma.washRequest.findFirst({
    where: { vehicleId: vehicle.id, status: 'pending' },
    orderBy: { createdAt: 'desc' }
  })

  // Active wash (queued or washing)
  const activeWash = await prisma.wash.findFirst({
    where: { vehicleId: vehicle.id, status: { in: ['queued', 'washing'] } },
    include: { package: true, worker: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })

  // Queue position
  let queuePosition: number | null = null
  if (activeWash) {
    queuePosition = await prisma.wash.count({
      where: {
        shopId: vehicle.shopId,
        status: { in: ['queued', 'washing'] },
        createdAt: { lt: activeWash.createdAt }
      }
    }) + 1
  }

  // Recent done washes
  const recentWashes = await prisma.wash.findMany({
    where: { vehicleId: vehicle.id, status: 'done' },
    include: { package: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  // Loyalty count
  const activeStamps = await prisma.wash.count({
    where: { vehicleId: vehicle.id, shopId: vehicle.shopId, redeemed: false, status: 'done' }
  })
  const isRewardReady = activeStamps >= vehicle.vehicleType.washGoal

  // Determine what status to show
  let displayWash = activeWash ? {
    status: activeWash.status,
    packageName: activeWash.package?.name || null,
    workerName: activeWash.worker?.name || null,
    startedAt: activeWash.washStartAt?.toISOString() || null,
    createdAt: activeWash.createdAt.toISOString(),
  } : pendingRequest ? {
    status: 'pending_approval',
    packageName: null, workerName: null, startedAt: null,
    createdAt: pendingRequest.createdAt.toISOString(),
  } : null

  return ok({
    found: true, plateNo,
    shop: vehicle.shop,
    vehicle: { make: vehicle.make, color: vehicle.color },
    vehicleType: { name: vehicle.vehicleType.name, icon: vehicle.vehicleType.icon, washGoal: vehicle.vehicleType.washGoal },
    customer: { name: vehicle.customer.name },
    activeWash: displayWash,
    queuePosition,
    recentWashes: recentWashes.map(w => ({
      id: w.id, createdAt: w.createdAt.toISOString(),
      packageName: w.package?.name || null,
      paid: w.paid, paymentMethod: w.paymentMethod, redeemed: w.redeemed
    })),
    activeStamps, washGoal: vehicle.vehicleType.washGoal, isRewardReady,
  })
}
