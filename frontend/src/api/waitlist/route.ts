import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
export async function POST(req: Request) {
  const { contact } = await req.json()
  if (!contact?.trim()) return err('Contact required')
  try { await prisma.platformWaitlist.create({ data: { contact: contact.trim() } }) } catch { /* duplicate */ }
  return ok({ joined: true })
}
