import type { Funnel } from '@prisma/client'
import { deriveMontantTotal, echeanceProche, totalRevenus, type DossierData } from '@/lib/dossier/schema'

// ─── Moteur de taux — pur, zéro backend ────────────────────────────────
// Calcule le taux « dès X% » et les fourchettes par type de prêteur à partir
// des réponses du wizard (étapes 1-3). `estimateRate` est une fonction pure
// (aucun accès réseau, aucune horloge) ; `buildRateProfile` mappe le dossier
// vers le profil et détermine le forward (échéance > 6 mois).

// Durées affichées sur la page « taux du jour » (années).
export const DISPLAY_TERMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15] as const
export type DisplayTerm = (typeof DISPLAY_TERMS)[number]

// CONFIG — l'ANCRE est éditée à la main (hebdo) ; les taux affichés dérivent
// ensuite automatiquement des données publiques BNS :
//   affiché[durée] = anchor[durée] + (rendement_du_jour − rendement_à_l'ancre)
// `anchorYields` (rendements Confédération BNS) et `anchorSaron` sont le
// snapshot BNS capturé au jour de l'ancre (voir scripts/rates:anchor).
export const RATE_CONFIG = {
  anchorDate: '2026-07-13',
  // Ancres « meilleur du marché » par durée (édition manuelle) — SARON + fixes.
  anchor: {
    saron: 0.95,
    2: 1.05,
    3: 1.1,
    4: 1.18,
    5: 1.25,
    6: 1.33,
    7: 1.4,
    8: 1.46,
    9: 1.51,
    10: 1.55,
    15: 1.85,
  } as Record<'saron' | DisplayTerm, number>,
  // Snapshot BNS au jour de l'ancre (auto — SARON + rendements Confédération).
  anchorSaron: -0.04,
  anchorYields: {
    2: -0.083,
    3: -0.043,
    4: 0.013,
    5: 0.078,
    6: 0.144,
    7: 0.209,
    8: 0.271,
    9: 0.327,
    10: 0.378,
    15: 0.545,
  } as Record<DisplayTerm, number>,
  avgMarketRate: 2.6, // taux moyen des hypothèques en cours (économie potentielle)
  updatedAt: '2026-07-13',
} as const

export type Duration = 'saron' | 'y5' | 'y10' | 'y15'
export type EngineBase = Record<Duration, number>

// Arrondi d'affichage : 0,01 près, plancher 0,50 %.
const displayRound = (n: number) => Math.max(0.5, Math.round(n * 100) / 100)

/** Rendement pour une durée : valeur BNS exacte, sinon interpolation/
    extrapolation linéaire sur les durées connues, sinon rendement d'ancre. */
function yieldForTerm(yields: Record<number, number>, term: number): number | null {
  if (yields[term] != null) return yields[term]!
  const known = Object.keys(yields)
    .map(Number)
    .filter((k) => Number.isFinite(yields[k]!))
    .sort((a, b) => a - b)
  if (known.length === 0) return null
  if (term <= known[0]!) return yields[known[0]!]!
  if (term >= known[known.length - 1]!) return yields[known[known.length - 1]!]!
  for (let i = 0; i < known.length - 1; i++) {
    const a = known[i]!
    const b = known[i + 1]!
    if (term >= a && term <= b) {
      const ratio = (term - a) / (b - a)
      return yields[a]! + (yields[b]! - yields[a]!) * ratio
    }
  }
  return null
}

/** Taux affichés du jour : ancre + delta de rendement BNS (pur). */
export function computeDisplayedRates(
  snbSaron: number | null,
  snbYields: Record<number, number>
): { saron: number } & Record<DisplayTerm, number> {
  const saronDelta = (snbSaron ?? RATE_CONFIG.anchorSaron) - RATE_CONFIG.anchorSaron
  const out = { saron: displayRound(RATE_CONFIG.anchor.saron + saronDelta) } as {
    saron: number
  } & Record<DisplayTerm, number>
  for (const term of DISPLAY_TERMS) {
    const y = yieldForTerm(snbYields, term) ?? RATE_CONFIG.anchorYields[term]
    const delta = y - RATE_CONFIG.anchorYields[term]
    out[term] = displayRound(RATE_CONFIG.anchor[term] + delta)
  }
  return out
}

/** Base du moteur (wizard) = mêmes taux calculés du jour. Sans argument :
    valeurs d'ancre (delta 0), pour un rendu instantané hors ligne. */
export function engineBase(computed?: { saron: number } & Record<number, number>): EngineBase {
  const c =
    computed ?? ({ ...RATE_CONFIG.anchor } as { saron: number } & Record<number, number>)
  return { saron: c.saron, y5: c[5]!, y10: c[10]!, y15: c[15]! }
}
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

/** Cœur pur : profil + durée → taux/fourchettes ou cas non standard.
 *  `allowBorderline` : accepte la zone limite (LTV 80-90 % / charges 33-38 %)
 *  avec une prime, au lieu de basculer en non standard — utilisé par le
 *  calculateur de la home qui affiche quand même une fourchette. */
export function estimateRate(
  profile: RateProfile,
  duration: Duration,
  base: EngineBase = engineBase(),
  opts?: { allowBorderline?: boolean }
): RateResult {
  const { montant, valeur, revenusBrutsAnnuels, amortissementAnnuel, usage, forward } = profile
  const borderline = opts?.allowBorderline === true

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
  else if (borderline && ltv <= 0.9) delta += 0.35
  else if (borderline) delta += 0.6 // hors cadre : prime, mais on affiche un taux
  else return { nonStandard: true, reason: 'ltv' }

  // Tenue des charges : intérêts théoriques 5 % + entretien 1 % + amortissement
  const affordability =
    (montant * 0.05 + valeur * 0.01 + (ltv > 0.65 ? amortissementAnnuel : 0)) / revenusBrutsAnnuels
  if (affordability <= 0.28) delta += 0
  else if (affordability <= 0.33) delta += 0.05
  else if (borderline && affordability <= 0.38) delta += 0.15
  else if (borderline) delta += 0.35 // hors cadre : prime, mais on affiche un taux
  else return { nonStandard: true, reason: 'charges' }

  // Montant
  if (montant < 400_000) delta += 0.05
  else if (montant <= 1_000_000) delta += 0
  else delta -= 0.05

  // Usage du bien
  delta += usage === 'principal' ? 0 : usage === 'secondaire' ? 0.1 : 0.15

  // Forward (échéance à plus de 6 mois)
  if (forward) delta += 0.08

  const t = base[duration] + delta

  // Fourchettes par type de prêteur. Deux ingrédients :
  //  • borne basse (offset selon la durée) : institutionnels meilleurs à
  //    ≥ 10 ans, banques meilleures en dessous → l'ordre s'inverse avec la durée ;
  //  • largeur propre au type : banques le marché le plus dispersé (cantonales
  //    vs régionales), assurances le pricing le plus uniforme.
  const long = duration === 'y10' || duration === 'y15'
  const lowOffset: Record<LenderType, number> = long
    ? { BANQUE: 0, CAISSE_PENSION: -0.05, ASSURANCE: -0.08 }
    : { BANQUE: 0, CAISSE_PENSION: 0.05, ASSURANCE: 0.08 }
  const width: Record<LenderType, number> = { BANQUE: 0.28, CAISSE_PENSION: 0.2, ASSURANCE: 0.15 }
  const raw: LenderRange[] = (['BANQUE', 'CAISSE_PENSION', 'ASSURANCE'] as LenderType[]).map(
    (type) => ({ type, min: t + lowOffset[type], max: t + lowOffset[type] + width[type] })
  )

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
