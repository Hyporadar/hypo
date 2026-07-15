import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { fetchLatestSnb, fetchSnbRange } from '@/lib/rates/snb'
import {
  DISPLAY_TERMS,
  RATE_CONFIG,
  computeDisplayedRates,
  engineBase,
  type EngineBase,
} from '@/lib/dossier/rate-engine'

// ─── Mise à jour des taux depuis la BNS ─────────────────────────────────
// Idempotent : un RateSnapshot par jour de données BNS. Si l'API ne répond
// pas (week-end, férié, réseau), on conserve les dernières valeurs et on
// log en silence — aucune erreur visible côté site.

type Computed = { saron: number } & Record<number, number>

/** Projette les taux calculés dans ReferenceRate (page + calibration). */
async function projectReferenceRates(computed: Computed): Promise<void> {
  await prisma.referenceRate.upsert({
    where: { type_termYears: { type: 'SARON', termYears: 0 } },
    create: { type: 'SARON', termYears: 0, rate: computed.saron },
    update: { rate: computed.saron },
  })
  for (const term of DISPLAY_TERMS) {
    await prisma.referenceRate.upsert({
      where: { type_termYears: { type: 'FIXE', termYears: term } },
      create: { type: 'FIXE', termYears: term, rate: computed[term]! },
      update: { rate: computed[term]! },
    })
  }
}

export interface UpdateResult {
  ok: boolean
  reason?: 'no-data' | 'already-current'
  date?: string
  computed?: Computed
}

/** Récupère le dernier point BNS, calcule et persiste (si nouveau jour). */
export async function updateRatesFromSnb(): Promise<UpdateResult> {
  const snb = await fetchLatestSnb()
  if (!snb) {
    console.info('[rates] BNS injoignable — dernières valeurs conservées')
    return { ok: false, reason: 'no-data' }
  }

  // Date du snapshot = point le plus récent des deux séries.
  const dataDate = [snb.yieldsDate, snb.saronDate].filter(Boolean).sort().at(-1)!
  const existing = await prisma.rateSnapshot.findUnique({
    where: { date: new Date(dataDate) },
    select: { id: true },
  })
  if (existing) return { ok: true, reason: 'already-current', date: dataDate }

  const computed = computeDisplayedRates(snb.saron, snb.yields)
  await prisma.rateSnapshot.create({
    data: {
      date: new Date(dataDate),
      saron: snb.saron,
      yields: snb.yields as Prisma.InputJsonValue,
      computed: computed as Prisma.InputJsonValue,
    },
  })
  await projectReferenceRates(computed)
  return { ok: true, date: dataDate, computed }
}

/** Backfill du graphique : reconstruit l'historique sur `days` jours BNS. */
export async function backfillHistory(days = 400): Promise<{ inserted: number }> {
  const series = await fetchSnbRange(days)
  let inserted = 0
  for (const point of series) {
    if (!point.yields) continue
    const computed = computeDisplayedRates(point.saron, point.yields)
    const res = await prisma.rateSnapshot
      .upsert({
        where: { date: new Date(point.date) },
        create: {
          date: new Date(point.date),
          saron: point.saron,
          yields: point.yields as Prisma.InputJsonValue,
          computed: computed as Prisma.InputJsonValue,
        },
        update: {},
      })
      .catch(() => null)
    if (res) inserted++
  }
  return { inserted }
}

export interface TodayRates {
  date: string | null
  computed: Computed
  base: EngineBase
}

/** Dernier snapshot → taux affichés + base moteur. Fallback : ancre. */
export async function loadTodayRates(): Promise<TodayRates> {
  const latest = await prisma.rateSnapshot
    .findFirst({ orderBy: { date: 'desc' } })
    .catch(() => null)
  if (!latest) {
    const anchorComputed = computeDisplayedRates(null, {}) // delta 0 → ancre
    return { date: null, computed: anchorComputed, base: engineBase() }
  }
  const computed = latest.computed as Computed
  return { date: latest.date.toISOString().slice(0, 10), computed, base: engineBase(computed) }
}

/** Historique du fixe 10 ans pour le graphique (un point par jour BNS). */
export async function loadRateHistory(
  limit = 90
): Promise<Array<{ date: Date; rate: number }>> {
  const rows = await prisma.rateSnapshot
    .findMany({ orderBy: { date: 'asc' }, take: limit, select: { date: true, computed: true } })
    .catch(() => [])
  return rows
    .map((r) => ({ date: r.date, rate: Number((r.computed as Computed)[10]) }))
    .filter((p) => Number.isFinite(p.rate))
}

export { RATE_CONFIG }
