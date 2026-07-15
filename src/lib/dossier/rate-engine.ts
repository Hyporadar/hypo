import type { Funnel } from '@prisma/client'
import { deriveMontantTotal, echeanceProche, totalRevenus, type DossierData } from '@/lib/dossier/schema'

// ─── Moteur de taux — pur, zéro backend ────────────────────────────────
// Calcule le taux « dès X% » et les fourchettes par type de prêteur à partir
// des réponses du wizard (étapes 1-3). `estimateRate` est une fonction pure
// (aucun accès réseau, aucune horloge) ; `buildRateProfile` mappe le dossier
// vers le profil et détermine le forward (échéance > 6 mois).

// CONFIG — mise à jour manuelle hebdomadaire depuis les grilles publiques.
export const RATE_CONFIG = {
  base: { saron: 0.95, y5: 1.25, y10: 1.55, y15: 1.85 }, // ancres « meilleur du marché »
  avgMarketRate: 2.6, // taux moyen des hypothèques en cours (économie potentielle)
  updatedAt: '2026-07-13',
} as const

export type Duration = keyof typeof RATE_CONFIG.base // 'saron' | 'y5' | 'y10' | 'y15'
export type LenderType = 'BANQUE' | 'CAISSE_PENSION' | 'ASSURANCE'
export type NonStandardReason = 'ltv' | 'charges' | 'incomplete'
export type Usage = 'principal' | 'secondaire' | 'rendement'

export interface RateProfile {
  montant: number // hypothèque demandée
  valeur: number // valeur / prix du bien
  revenusBrutsAnnuels: number
  amortissementAnnuel: number // amortissement pour ramener à 65 % (si LTV > 0.65)
  usage: Usage
  forward: boolean // échéance à plus de 6 mois
}

export interface LenderRange {
  type: LenderType
  min: number
  max: number
}

export interface RateEstimate {
  nonStandard: false
  taux: number // taux central (base + ajustements), arrondi 0.05
  from: number // « dès X% » = minimum des trois fourchettes
  lenders: LenderRange[] // triées par min croissant
  economyPerYear: number // (avgMarketRate − from) × montant, plancher 0, arrondi 100
}

export interface NonStandardResult {
  nonStandard: true
  reason: NonStandardReason
}

export type RateResult = RateEstimate | NonStandardResult

// Arrondi à 0.05 près (jamais de fausse précision type 1,73 %).
const round005 = (n: number) => Math.round(n * 20) / 20

/** Cœur pur : profil + durée → taux/fourchettes ou cas non standard. */
export function estimateRate(profile: RateProfile, duration: Duration): RateResult {
  const { montant, valeur, revenusBrutsAnnuels, amortissementAnnuel, usage, forward } = profile

  if (!(montant > 0) || !(valeur > 0) || !(revenusBrutsAnnuels > 0)) {
    return { nonStandard: true, reason: 'incomplete' }
  }

  let delta = 0

  // LTV = hypothèque / valeur
  const ltv = montant / valeur
  if (ltv <= 0.5) delta += 0
  else if (ltv <= 0.65) delta += 0.05
  else if (ltv <= 0.75) delta += 0.1
  else if (ltv <= 0.8) delta += 0.2
  else return { nonStandard: true, reason: 'ltv' }

  // Tenue des charges : intérêts théoriques 5 % + entretien 1 % + amortissement
  const affordability =
    (montant * 0.05 + valeur * 0.01 + (ltv > 0.65 ? amortissementAnnuel : 0)) / revenusBrutsAnnuels
  if (affordability <= 0.28) delta += 0
  else if (affordability <= 0.33) delta += 0.05
  else return { nonStandard: true, reason: 'charges' }

  // Montant
  if (montant < 400_000) delta += 0.05
  else if (montant <= 1_000_000) delta += 0
  else delta -= 0.05

  // Usage du bien
  delta += usage === 'principal' ? 0 : usage === 'secondaire' ? 0.1 : 0.15

  // Forward (échéance à plus de 6 mois)
  if (forward) delta += 0.08

  const t = RATE_CONFIG.base[duration] + delta

  // Fourchettes par type de prêteur (institutionnels meilleurs sur le long).
  const long = duration === 'y10' || duration === 'y15'
  const raw: LenderRange[] = long
    ? [
        { type: 'BANQUE', min: t, max: t + 0.2 },
        { type: 'CAISSE_PENSION', min: t - 0.05, max: t + 0.15 },
        { type: 'ASSURANCE', min: t - 0.08, max: t + 0.12 },
      ]
    : [
        { type: 'BANQUE', min: t, max: t + 0.2 },
        { type: 'CAISSE_PENSION', min: t + 0.05, max: t + 0.25 },
        { type: 'ASSURANCE', min: t + 0.08, max: t + 0.28 },
      ]

  const lenders = raw
    .map((l) => ({ type: l.type, min: round005(l.min), max: round005(l.max) }))
    .sort((a, b) => a.min - b.min)

  const from = Math.min(...lenders.map((l) => l.min))
  const economyPerYear = Math.max(
    0,
    Math.round(((RATE_CONFIG.avgMarketRate - from) / 100) * montant / 100) * 100
  )

  return { nonStandard: false, taux: round005(t), from, lenders, economyPerYear }
}

function mapUsage(usage: DossierData['bien']['usage']): Usage {
  switch (usage) {
    case 'RENDEMENT':
    case 'LOUE_PARTIEL':
      return 'rendement'
    case 'VACANCES':
    case 'RESIDENCE_SECONDAIRE':
      return 'secondaire'
    default:
      return 'principal'
  }
}

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 183

/** Mappe le dossier vers un profil de taux. Impur (lit l'horloge pour le
    forward) mais hors composant — donc pas de souci de pureté React. */
export function buildRateProfile(funnel: Funnel, data: DossierData): RateProfile {
  const valeur = data.bien.valeur ?? data.bien.prixAchat ?? 0
  const montant = deriveMontantTotal(funnel, data) ?? 0
  const revenusBrutsAnnuels = totalRevenus(data)
  const amortissementAnnuel = valeur > 0 ? Math.max(0, (montant - 0.65 * valeur) / 15) : 0

  // Forward : date de départ souhaitée à plus de 6 mois.
  const startDate =
    funnel === 'ACHAT'
      ? data.bien.dateAchat
        ? new Date(data.bien.dateAchat)
        : null
      : echeanceProche(data)
  const forward = startDate ? startDate.getTime() - Date.now() > SIX_MONTHS_MS : false

  return {
    montant,
    valeur,
    revenusBrutsAnnuels,
    amortissementAnnuel,
    usage: mapUsage(data.bien.usage),
    forward,
  }
}
