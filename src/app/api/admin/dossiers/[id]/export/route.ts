import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Export JSON complet du dossier + TOUTES ses versions (ADMIN uniquement).
// Traçabilité LSFin/LBA : rien n'est jamais purgé, tout est exportable.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, name: true, email: true, status: true, funnel: true } },
      versions: { orderBy: { numero: 'asc' } },
      dossierEvents: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!dossier) return NextResponse.json({ error: 'not-found' }, { status: 404 })

  await prisma.dossierEvent.create({
    data: {
      dossierId: id,
      type: 'CONSULTATION',
      actorType: 'ADMIN',
      actorId: session.user.id,
      data: { action: 'export-json' },
    },
  })

  return new NextResponse(JSON.stringify(dossier, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="dossier-${id.slice(0, 8)}.json"`,
    },
  })
}
