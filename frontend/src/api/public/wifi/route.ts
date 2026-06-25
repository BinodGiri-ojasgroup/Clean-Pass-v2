// app/api/public/wifi/route.ts — PUBLIC, no auth
import { prisma } from '@/lib/prisma'
import { err, ok } from '@/lib/api'
import QRCode from 'qrcode'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const shopId = searchParams.get('shopId')
  if (!shopId) return err('shopId required')

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, wifiName: true, wifiPassword: true, wifiType: true, wifiHidden: true, active: true }
  })

  if (!shop || !shop.active) return err('Shop not found', 404)
  if (!shop.wifiName) return ok({ configured: false })

  // Generate WiFi QR string
  const escape = (s: string) => s.replace(/[\\;,"]/g, c => `\\${c}`)
  const wifiString = [
    'WIFI:',
    `T:${shop.wifiType || 'WPA'};`,
    `S:${escape(shop.wifiName)};`,
    shop.wifiPassword ? `P:${escape(shop.wifiPassword)};` : 'P:;',
    `H:${shop.wifiHidden ? 'true' : 'false'};;`,
  ].join('')

  const qrDataUrl = await QRCode.toDataURL(wifiString, {
    width: 280,
    margin: 2,
    color: { dark: '#0e0a06', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })

  return ok({
    configured: true,
    shopName: shop.name,
    ssid: shop.wifiName,
    qrCode: qrDataUrl,
    // Only expose password if no password type
    password: shop.wifiType === 'nopass' ? null : shop.wifiPassword,
  })
}
