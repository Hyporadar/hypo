import { NextResponse } from 'next/server'
import { z } from 'zod'
import { calibrateOffers } from '@/lib/dossier/calibration'
import { dossierDataSchema } from '@/lib/dossier/schema'
import { loadRefRates } from '@/server/dossier/rates'

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

  const rates = await loadRefRates()
  const result = calibrateOffers(parsed.data.funnel, data.data, rates)
  return NextResponse.json(result)
}
