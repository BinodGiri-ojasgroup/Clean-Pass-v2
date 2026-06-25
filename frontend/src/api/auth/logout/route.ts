import { ok } from '@/lib/api'
import { cookies } from 'next/headers'
export async function POST() {
  const c = await cookies(); c.delete('cleanpass_token')
  return ok({ message: 'Logged out' })
}
