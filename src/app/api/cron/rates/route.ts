import { NextResponse } from 'next/server'
import { backfillHistory, updateRatesFromSnb } from '@/server/rates/update'

// Job quotidien : dérive les taux du jour depuis la BNS (SARON + rendements
// Confédération) et les persiste. Idempotent — Vercel cron, crontab, ou à la
// main en dev : curl "localhost:3400/api/cron/rates".
// `?backfill=400` reconstruit l'historique du graphique en une passe.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const backfillDays = Number(new URL(req.url).searchParams.get('backfill'))
  const backfill =
    Number.isFinite(backfillDays) && backfillDays > 0 ? await backfillHistory(backfillDays) : null

  const update = await updateRatesFromSnb()
  return NextResponse.json({ ok: true, update, backfill })
}
