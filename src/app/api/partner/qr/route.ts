import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'

// QR du lien apporteur (?ref=CODE) — réservé au PARTNER connecté.
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PARTNER') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const partner = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { partnerCode: true },
  })
  if (!partner?.partnerCode) {
    return NextResponse.json({ error: 'no-code' }, { status: 404 })
  }

  const url = `${BASE_URL}/fr?ref=${partner.partnerCode}`
  const png = await QRCode.toBuffer(url, {
    width: 600,
    margin: 2,
    color: { dark: '#211E1A', light: '#FFFFFF' },
  })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="hyporadar-qr.png"',
    },
  })
}
