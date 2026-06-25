import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { err, ok } from '@/lib/api'
import QRCode from 'qrcode'

export async function GET() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://carwash.ojassolutions.com.np'
  const scanUrl = `${baseUrl}/scan/${session.shopId}`

  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 300, margin: 2,
    color: { dark: '#0c1a2e', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })

  await prisma.shop.update({ where: { id: session.shopId }, data: { qrCode: qrDataUrl } })
  return ok({ qrCode: qrDataUrl, scanUrl })
}
