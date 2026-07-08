import { prisma } from '@/lib/prisma'
import type { RefRates } from '@/lib/dossier/calibration'

/** Taux de référence en base + garde-fous (partagé wizard + admin). */
export async function loadRefRates(): Promise<RefRates> {
  const rows = await prisma.referenceRate.findMany().catch(() => [])
  const rates: RefRates = { saron: null, fixed: {} }
  for (const rate of rows) {
    if (rate.type === 'SARON') rates.saron = Number(rate.rate)
    else rates.fixed[rate.termYears] = Number(rate.rate)
  }
  if (rates.saron === null) rates.saron = 0.9
  if (!Object.keys(rates.fixed).length) rates.fixed = { 5: 1.3, 10: 1.75, 15: 2.0 }
  rates.fixed[15] ??= Math.round(((rates.fixed[10] ?? 1.75) + 0.25) * 100) / 100
  return rates
}
