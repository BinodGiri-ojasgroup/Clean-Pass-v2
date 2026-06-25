import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { err, ok } from '@/lib/api'
import QRCode from 'qrcode'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const c = await prisma.washCentre.findUnique({ where: { id: session.centreId }, select: { wifiName: true, wifiPassword: true, wifiType: true, wifiHidden: true } })
  if (!c?.wifiName) return ok({ configured: false })
  const wifiStr = `WIFI:T:${c.wifiType || 'WPA'};S:${c.wifiName};P:${c.wifiPassword || ''};H:${c.wifiHidden ? 'true' : 'false'};;`
  const qrCode = await QRCode.toDataURL(wifiStr, { width: 300, margin: 2 })
  return ok({ configured: true, qrCode, ssid: c.wifiName, password: c.wifiPassword })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  const { wifiName, wifiPassword, wifiType, wifiHidden } = await req.json()
  await prisma.washCentre.update({ where: { id: session.centreId }, data: { wifiName, wifiPassword, wifiType, wifiHidden: !!wifiHidden } })
  return ok({ saved: true })
}
