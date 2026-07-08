import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Autocomplete NPA/localité — résultat au format « VD-1003 Lausanne ».
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  const isNumeric = /^\d+$/.test(q)
  const results = await prisma.swissLocality.findMany({
    where: isNumeric
      ? { npa: { startsWith: q } }
      : { localite: { contains: q, mode: 'insensitive' } },
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
