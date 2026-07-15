import { NextResponse } from 'next/server'
import { fetchLatestSnb } from '@/lib/rates/snb'

// Aide au ré-ancrage manuel (hebdo) : renvoie le snapshot BNS du jour au
// format `RATE_CONFIG`. On édite les 8 taux d'`anchor` (meilleur du marché),
// puis on colle `anchorDate` / `anchorSaron` / `anchorYields` d'ici — le
// snapshot des rendements se refait ainsi tout seul.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const snb = await fetchLatestSnb()
  if (!snb) return NextResponse.json({ error: 'snb-unreachable' }, { status: 502 })
  return NextResponse.json({
    anchorDate: [snb.yieldsDate, snb.saronDate].filter(Boolean).sort().at(-1),
    anchorSaron: snb.saron,
    anchorYields: snb.yields,
    note: 'À coller dans RATE_CONFIG (rate-engine.ts) après édition des taux anchor.',
  })
}
