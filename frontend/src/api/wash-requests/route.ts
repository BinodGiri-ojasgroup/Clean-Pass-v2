import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { err, ok } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const requests = await prisma.washRequest.findMany({
    where: { centreId: session.centreId, status: 'pending' },
    orderBy: { createdAt: 'asc' }
  })
  return ok(requests)
}
