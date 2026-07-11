import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/normalize'

// Autocomplete NPA/localité — résultat au format « VD-1003 Lausanne ».
// Recherche sur une colonne normalisée : insensible à la casse ET aux
// accents (« geneve » → Genève), et par NPA ou par nom indifféremment.
// Les variantes postales (« Delémont 1 », « Lausanne 10 ») sont repliées
// sur le nom de commune : on n'affiche chaque commune qu'une seule fois.
const baseName = (localite: string) => localite.replace(/\s+\d+$/, '').trim()

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return NextResponse.json({ results: [] })
  const q = normalize(raw)

  // On récupère large puis on déduplique par (NPA, commune) pour absorber
  // les variantes postales, avant de limiter à 8 résultats.
  const rows = await prisma.swissLocality.findMany({
    where: { recherche: { contains: q } },
    orderBy: [{ npa: 'asc' }, { localite: 'asc' }],
    take: 60,
  })

  const seen = new Set<string>()
  const results: Array<{ npa: string; localite: string; canton: string; label: string }> = []
  for (const r of rows) {
    const commune = baseName(r.localite)
    const key = `${r.npa}|${normalize(commune)}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      npa: r.npa,
      localite: commune,
      canton: r.canton,
      label: `${r.canton}-${r.npa} ${commune}`,
    })
    if (results.length >= 8) break
  }

  return NextResponse.json({ results })
}
