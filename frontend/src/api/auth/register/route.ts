import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { name, email, password, phone, address } = await req.json()
  if (!name?.trim() || !email?.trim() || !password?.trim()) return err('Name, email and password required')
  if (password.length < 6) return err('Password must be at least 6 characters')
  const existing = await prisma.shop.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return err('An account with this email already exists')
  const hashed = await bcrypt.hash(password, 10)
  const shop = await prisma.shop.create({
    data: { name: name.trim(), email: email.toLowerCase().trim(), password: hashed, phone: phone?.trim() || null, address: address?.trim() || null }
  })
  // Seed default vehicle types
  await prisma.vehicleType.createMany({ data: [
    { shopId: shop.id, name: 'Car', icon: '🚗', washGoal: 8 },
    { shopId: shop.id, name: 'Motorcycle', icon: '🏍️', washGoal: 10 },
    { shopId: shop.id, name: 'Jeep / SUV', icon: '🚙', washGoal: 8 },
    { shopId: shop.id, name: 'Bus / Microbus', icon: '🚌', washGoal: 6 },
  ]})
  // Seed default packages
  await prisma.washPackage.createMany({ data: [
    { shopId: shop.id, name: 'Basic Wash', description: 'Exterior wash + rinse', price: 200, stampValue: 1, color: '#0ea5e9' },
    { shopId: shop.id, name: 'Premium Wash', description: 'Exterior + interior vacuum', price: 350, stampValue: 1, color: '#8b5cf6' },
    { shopId: shop.id, name: 'Full Detail', description: 'Complete inside-out detail', price: 600, stampValue: 2, color: '#f59e0b' },
  ]})
  const token = await signToken({ shopId: shop.id, email: shop.email })
  const c = await cookies()
  c.set('cleanpass_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return ok({ shopId: shop.id, name: shop.name })
}
