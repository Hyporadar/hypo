import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitClientEvent } from '@/server/events'
import { renderCertificatePdf } from '@/server/pdf/certificate'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const certificate = await prisma.certificate.findUnique({ where: { id } })
  if (!certificate) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  await emitClientEvent({ type: 'CERTIFICAT_TELECHARGE', leadId: certificate.leadId })
  const pdf = await renderCertificatePdf(certificate)
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="hypopilot-${certificate.number}.pdf"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
