import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) return err('Email and password required')
  const shop = await prisma.shop.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!shop) return err('No account found with this email')
  const valid = await bcrypt.compare(password, shop.password)
  if (!valid) return err('Incorrect password')
  const token = await signToken({ shopId: shop.id, email: shop.email })
  const c = await cookies()
  c.set('cleanpass_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return ok({ shopId: shop.id, name: shop.name })
}
