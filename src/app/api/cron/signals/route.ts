import { NextResponse } from 'next/server'
import { evaluateSignals } from '@/server/signals/engine'
import { runNurturing } from '@/server/signals/nurturing'

// Job périodique : évalue les règles de signaux puis envoie le nurturing.
// Idempotent — peut être appelé aussi souvent que nécessaire (Vercel cron,
// crontab, ou à la main en dev : curl localhost:3000/api/cron/signals).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const signals = await evaluateSignals(now)
  const nurturing = await runNurturing(now)

  return NextResponse.json({ ok: true, at: now.toISOString(), signals, nurturing })
}
