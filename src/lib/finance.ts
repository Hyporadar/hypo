// ─── Règles métier suisses — module unique, fonctions pures ───────────
// Toute la logique financière et de routage des leads vit ici.
// Aucun calcul financier ailleurs dans l'application.

// Tenue des charges
export const TAUX_THEORIQUE = 0.05 // taux d'intérêt théorique sur le prêt
export const FRAIS_ENTRETIEN = 0.01 // frais d'entretien : 1% du prix par an
export const CHARGE_MAX = 0.33 // charges totales ≤ 33% du revenu brut annuel

// Amortissement (2e rang)
export const LTV_CIBLE = 0.65 // dette ramenée à 65% de la valeur du bien
export const DUREE_AMORTISSEMENT_ANNEES = 15

// Fonds propres
export const FONDS_PROPRES_MIN = 0.2 // minimum 20% du prix
export const FONDS_PROPRES_HORS_2E_PILIER_MIN = 0.1 // dont au moins 10% hors 2e pilier

// Renouvellement — seuils de routage des leads (en mois avant l'échéance)
export const SEUIL_CHAUD_MOIS = 18 // < 18 mois : lead chaud
export const SEUIL_TROP_TARD_MOIS = 4 // < 4 mois : préavis probablement dépassé
export const FENETRE_ACTION_MOIS = [12, 18] as const // fenêtre d'action idéale
export const PREAVIS_TYPIQUE_MOIS = [3, 6] as const // préavis de résiliation typique

// ─── Capacité d'achat ─────────────────────────────────────────────────

export interface AffordabilityInput {
  /** Prix du bien, CHF */
  price: number
  /** Revenu brut annuel du ménage, CHF */
  annualGrossIncome: number
  /** Fonds propres totaux, CHF */
  ownFunds: number
  /** Dont 2e pilier, CHF */
  ownFundsPillar2: number
}

export interface AffordabilityResult {
  /** Montant du prêt, CHF */
  loanAmount: number
  /** Intérêts théoriques annuels (5% du prêt), CHF */
  annualInterest: number
  /** Amortissement annuel (dette → 65% en 15 ans), CHF */
  annualAmortization: number
  /** Frais d'entretien annuels (1% du prix), CHF */
  annualMaintenance: number
  /** Charges annuelles totales, CHF */
  annualCosts: number
  /** Charges / revenu brut annuel */
  chargeRatio: number
  /** Tenue des charges respectée (≤ 33%) */
  meetsCharge: boolean
  /** Fonds propres ≥ 20% du prix */
  meetsOwnFunds: boolean
  /** Fonds propres hors 2e pilier ≥ 10% du prix */
  meetsHardOwnFunds: boolean
  /** Toutes les conditions réunies */
  feasible: boolean
  /** Prix maximal finançable avec ce revenu et ces fonds propres, CHF */
  maxAffordablePrice: number
}

/** Amortissement annuel pour ramener la dette à 65% de la valeur en 15 ans. */
export function annualAmortization(loanAmount: number, propertyValue: number): number {
  const excess = loanAmount - LTV_CIBLE * propertyValue
  return Math.max(0, excess / DUREE_AMORTISSEMENT_ANNEES)
}

/** Charges annuelles théoriques : 5% du prêt + amortissement + 1% du prix. */
export function annualCosts(price: number, loanAmount: number): number {
  return (
    TAUX_THEORIQUE * loanAmount + annualAmortization(loanAmount, price) + FRAIS_ENTRETIEN * price
  )
}

export function computeAffordability(input: AffordabilityInput): AffordabilityResult {
  const { price, annualGrossIncome, ownFunds, ownFundsPillar2 } = input

  const loanAmount = Math.max(0, price - ownFunds)
  const interest = TAUX_THEORIQUE * loanAmount
  const amortization = annualAmortization(loanAmount, price)
  const maintenance = FRAIS_ENTRETIEN * price
  const costs = interest + amortization + maintenance

  const chargeRatio = annualGrossIncome > 0 ? costs / annualGrossIncome : Infinity
  const meetsCharge = chargeRatio <= CHARGE_MAX
  const meetsOwnFunds = ownFunds >= FONDS_PROPRES_MIN * price
  const meetsHardOwnFunds = ownFunds - ownFundsPillar2 >= FONDS_PROPRES_HORS_2E_PILIER_MIN * price

  return {
    loanAmount,
    annualInterest: interest,
    annualAmortization: amortization,
    annualMaintenance: maintenance,
    annualCosts: costs,
    chargeRatio,
    meetsCharge,
    meetsOwnFunds,
    meetsHardOwnFunds,
    feasible: meetsCharge && meetsOwnFunds && meetsHardOwnFunds,
    maxAffordablePrice: maxAffordablePrice(annualGrossIncome, ownFunds, ownFundsPillar2),
  }
}

/**
 * Prix maximal finançable — résolution algébrique des trois contraintes :
 *   1. tenue des charges  : coûts(P) ≤ 33% du revenu
 *   2. fonds propres      : F ≥ 20% de P  →  P ≤ 5·F
 *   3. fonds propres durs : F − F2 ≥ 10% de P  →  P ≤ 10·(F − F2)
 */
export function maxAffordablePrice(
  annualGrossIncome: number,
  ownFunds: number,
  ownFundsPillar2: number
): number {
  const budget = CHARGE_MAX * annualGrossIncome

  // Branche avec amortissement (prêt > 65% du prix, cas standard) :
  // coûts = P·(5% + 1% + 35%/15) − F·(5% + 1/15)
  const coefP = TAUX_THEORIQUE + FRAIS_ENTRETIEN + (1 - LTV_CIBLE) / DUREE_AMORTISSEMENT_ANNEES
  const coefF = TAUX_THEORIQUE + 1 / DUREE_AMORTISSEMENT_ANNEES
  let byCharge = (budget + coefF * ownFunds) / coefP

  // Branche sans amortissement (fonds propres ≥ 35% du prix) :
  // coûts = P·(5% + 1%) − F·5%
  if (ownFunds >= (1 - LTV_CIBLE) * byCharge) {
    byCharge = (budget + TAUX_THEORIQUE * ownFunds) / (TAUX_THEORIQUE + FRAIS_ENTRETIEN)
  }

  const byOwnFunds = ownFunds / FONDS_PROPRES_MIN
  const byHardOwnFunds = (ownFunds - ownFundsPillar2) / FONDS_PROPRES_HORS_2E_PILIER_MIN

  return Math.max(0, Math.floor(Math.min(byCharge, byOwnFunds, byHardOwnFunds)))
}

// ─── Renouvellement ───────────────────────────────────────────────────

export interface RenewalSavingsInput {
  /** Montant restant dû, CHF */
  remainingAmount: number
  /** Taux actuel du client, en points de pourcentage (ex. 1.85) */
  currentRate: number
  /** Taux de référence du marché, en points de pourcentage (ex. 1.25) */
  referenceRate: number
}

/** Économie potentielle annuelle = (taux actuel − taux de référence) × montant restant. */
export function computeRenewalSavings(input: RenewalSavingsInput): number {
  const { remainingAmount, currentRate, referenceRate } = input
  return ((currentRate - referenceRate) / 100) * remainingAmount
}

// ─── Routage des leads renouvellement ─────────────────────────────────

export type RenewalClassification = 'CHAUD' | 'FROID' | 'TROP_TARD'

/** Nombre de mois entiers entre `now` et `date` (négatif si passée). Arithmétique UTC. */
export function monthsUntil(date: Date, now: Date): number {
  let months =
    (date.getUTCFullYear() - now.getUTCFullYear()) * 12 + (date.getUTCMonth() - now.getUTCMonth())
  if (date.getUTCDate() < now.getUTCDate()) {
    months -= 1
  }
  return months
}

/**
 * Routage selon la date d'échéance :
 *   < 4 mois  → TROP_TARD (préavis probablement dépassé, surveillance pour le prochain cycle)
 *   < 18 mois → CHAUD (appel d'offres)
 *   ≥ 18 mois → FROID (surveillance, réveil automatique dans la fenêtre 12–18 mois)
 */
export function classifyRenewal(endDate: Date, now: Date): RenewalClassification {
  const months = monthsUntil(endDate, now)
  if (months < SEUIL_TROP_TARD_MOIS) return 'TROP_TARD'
  if (months < SEUIL_CHAUD_MOIS) return 'CHAUD'
  return 'FROID'
}

/** Funnel Prisma correspondant (TROP_TARD rejoint le froid : surveillance du prochain cycle). */
export function renewalFunnel(
  endDate: Date,
  now: Date
): 'RENOUVELLEMENT_CHAUD' | 'RENOUVELLEMENT_FROID' {
  return classifyRenewal(endDate, now) === 'CHAUD' ? 'RENOUVELLEMENT_CHAUD' : 'RENOUVELLEMENT_FROID'
}

/** Date de réveil d'un lead froid : 18 mois avant l'échéance (entrée de fenêtre). */
export function wakeUpDate(endDate: Date): Date {
  const d = new Date(endDate)
  d.setUTCMonth(d.getUTCMonth() - SEUIL_CHAUD_MOIS)
  return d
}
