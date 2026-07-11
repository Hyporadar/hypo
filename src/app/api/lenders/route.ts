import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/normalize'

// Autocomplete des prêteurs — insensible aux accents et aux abréviations
// (« BCV » → Banque Cantonale Vaudoise ET du Valais, via Lender.alias).
export async function GET(req: Request) {
  const q = normalize(new URL(req.url).searchParams.get('q')?.trim() ?? '')
  if (q.length < 2) return NextResponse.json({ results: [] })

  const lenders = await prisma.lender.findMany({ where: { actif: true } })
  const results = lenders
    .filter(
      (l) =>
        normalize(l.nom).includes(q) ||
        normalize(l.nomCourt).includes(q) ||
        l.alias.some((a) => normalize(a).includes(q))
    )
    .slice(0, 8)
    .map((l) => ({ id: l.id, nom: l.nom, nomCourt: l.nomCourt, type: l.type }))

  return NextResponse.json({ results })
}
