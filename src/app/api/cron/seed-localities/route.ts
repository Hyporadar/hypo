import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/normalize'
import localities from '../../../../../prisma/data/npa-ch.json'

// Amorçage unique de SwissLocality (autocomplétion NPA/localité) sur la base
// de prod, protégé par CRON_SECRET. À appeler une fois après un déploiement
// sur une base vierge :  curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/seed-localities
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = (localities as Array<{ npa: string; localite: string; canton: string }>).map((l) => ({
    npa: l.npa,
    localite: l.localite,
    canton: l.canton,
    recherche: normalize(`${l.npa} ${l.localite} ${l.canton}`),
  }))

  await prisma.swissLocality.deleteMany()
  const res = await prisma.swissLocality.createMany({ data: rows, skipDuplicates: true })
  const total = await prisma.swissLocality.count()
  return NextResponse.json({ ok: true, inserted: res.count, total })
}
