import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/normalize'

// Autocomplete NPA/localité — résultat au format « VD-1003 Lausanne ».
// Recherche sur une colonne normalisée : insensible à la casse ET aux
// accents (« geneve » → Genève), et par NPA ou par nom indifféremment.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return NextResponse.json({ results: [] })
  const q = normalize(raw)

  const results = await prisma.swissLocality.findMany({
    where: { recherche: { contains: q } },
    orderBy: [{ npa: 'asc' }, { localite: 'asc' }],
    take: 8,
  })

  return NextResponse.json({
    results: results.map((r) => ({
      npa: r.npa,
      localite: r.localite,
      canton: r.canton,
      label: `${r.canton}-${r.npa} ${r.localite}`,
    })),
  })
}
