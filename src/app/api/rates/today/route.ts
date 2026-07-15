import { NextResponse } from 'next/server'
import { loadTodayRates } from '@/server/rates/update'

// Base de taux du jour pour le moteur d'estimation (wizard) — cohérente avec
// la page « taux du jour ». Lecture seule, cache court.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { date, base } = await loadTodayRates()
  return NextResponse.json(
    { date, base },
    { headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' } }
  )
}
