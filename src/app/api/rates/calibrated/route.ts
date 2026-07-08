import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { calibrateOffers, type RefRates } from '@/lib/dossier/calibration'
import { dossierDataSchema } from '@/lib/dossier/schema'

const bodySchema = z.object({
  funnel: z.enum(['ACHAT', 'RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID']),
  data: z.unknown(),
})

// Fourchettes calibrées par type de prêteur — recalculées à chaque réponse
// du wizard (debounce 400ms côté client).
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const data = dossierDataSchema.safeParse(parsed.data.data)
  if (!data.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const rows = await prisma.referenceRate.findMany().catch(() => [])
  const rates: RefRates = { saron: null, fixed: {} }
  for (const rate of rows) {
    if (rate.type === 'SARON') rates.saron = Number(rate.rate)
    else rates.fixed[rate.termYears] = Number(rate.rate)
  }
  if (rates.saron === null) rates.saron = 0.9
  if (!Object.keys(rates.fixed).length) rates.fixed = { 5: 1.3, 10: 1.75, 15: 2.0 }
  rates.fixed[15] ??= Math.round(((rates.fixed[10] ?? 1.75) + 0.25) * 100) / 100

  const result = calibrateOffers(parsed.data.funnel, data.data, rates)
  return NextResponse.json(result)
}
