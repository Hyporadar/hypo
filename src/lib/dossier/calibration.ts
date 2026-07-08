import type { Funnel } from '@prisma/client'
import { CHARGE_MAX, annualCosts } from '@/lib/finance'
import { deriveMontantTotal, totalRevenus, type DossierData } from '@/lib/dossier/schema'
import { computeCompleteness } from '@/lib/dossier/completeness'

// ─── Calibration des fourchettes d'offres ──────────────────────────────
// Pur et testé : à partir des taux de référence et du dossier partiel,
// produit des fourchettes par TYPE de prêteur × durée, qui s'affinent
// avec les réponses (LTV, tenue des charges, label éco).

export interface RefRates {
  saron: number | null
  fixed: Record<number, number>
}

export type CalibTerm = 'saron' | number

export interface CalibratedOffer {
  lenderType: 'BANQUE' | 'ASSURANCE' | 'CAISSE_PENSION'
  term: CalibTerm
  min: number
  max: number
}

export interface CalibrationResult {
  offers: CalibratedOffer[]
  calibrated: boolean // dossier complet → « fourchette calibrée »
  ltv: number | null
  chargeRatio: number | null
  adjustments: string[] // clés i18n des ajustements appliqués (transparence)
}

// Primes de base par type × durée (cohérentes avec le widget home).
const BASE_PREMIUMS: Record<CalibratedOffer['lenderType'], Record<string, number>> = {
  BANQUE: { saron: 0, '5': 0, '10': 0, '15': 0.1 },
  ASSURANCE: { saron: 0.12, '5': 0.1, '10': 0.08, '15': 0.05 },
  CAISSE_PENSION: { saron: 0.15, '5': 0.12, '10': 0.05, '15': -0.02 },
}

// Largeur de la fourchette : large en estimation, resserrée une fois calibrée.
const SPREAD_ESTIMATE = 0.2
const SPREAD_CALIBRATED = 0.08

const round2 = (n: number) => Math.round(n * 100) / 100

export function calibrateOffers(
  funnel: Funnel,
  data: DossierData,
  rates: RefRates,
  terms: CalibTerm[] = ['saron', 5, 10, 15]
): CalibrationResult {
  const adjustments: string[] = []

  // LTV : hypothèque demandée / valeur du bien.
  const valeur = data.bien.valeur ?? data.bien.prixAchat ?? null
  const montant = deriveMontantTotal(funnel, data)
  const ltv = valeur && montant ? montant / valeur : null

  let delta = 0
  if (ltv !== null && ltv > 0.8) {
    delta += 0.15
    adjustments.push('ltvHigh')
  } else if (ltv !== null && ltv <= 0.65) {
    delta -= 0.05
    adjustments.push('ltvLow')
  }

  // Tenue des charges (règles CLAUDE.md via finance.ts).
  const revenus = totalRevenus(data)
  const chargesTiers = data.emprunteurs
    .flatMap((e) => e.charges)
    .reduce((s, c) => s + c.montantAnnuel, 0)
  let chargeRatio: number | null = null
  if (revenus > 0 && valeur && montant) {
    chargeRatio = (annualCosts(valeur, montant) + chargesTiers) / revenus
    if (chargeRatio > CHARGE_MAX) {
      delta += 0.1
      adjustments.push('chargeTight')
    }
  }

  // Rabais hypothèque verte (« non » explicite = pas de label).
  if (data.bien.labelEco && data.bien.labelEco !== 'non') {
    delta -= 0.05
    adjustments.push('ecoDiscount')
  }

  const completeness = computeCompleteness(funnel, data)
  const calibrated = completeness.percent === 100
  const spread = calibrated ? SPREAD_CALIBRATED : SPREAD_ESTIMATE

  const offers: CalibratedOffer[] = []
  for (const lenderType of Object.keys(BASE_PREMIUMS) as CalibratedOffer['lenderType'][]) {
    for (const term of terms) {
      const base = term === 'saron' ? (rates.saron ?? 0.9) : (rates.fixed[term] ?? null)
      if (base === null) continue
      const premium = BASE_PREMIUMS[lenderType][String(term)] ?? 0.1
      const center = base + premium + delta
      offers.push({
        lenderType,
        term,
        min: round2(Math.max(0.2, center)),
        max: round2(Math.max(0.2, center) + spread),
      })
    }
  }

  return { offers, calibrated, ltv, chargeRatio, adjustments }
}
