// Classification de la finançabilité d'un dossier à partir des trois chiffres
// du calculateur (hypothèque, valeur, revenu). Pur, sans backend — partagé
// par le calculateur de la home et l'admin.
//
//   LTV     = hypothèque / valeur
//   charges = (hypothèque·5% + valeur·1% + amortissement) / revenu
//             amortissement = part au-dessus de 65 % de la valeur, sur 15 ans
//
//   standard     : LTV ≤ 80 %  ET  charges ≤ 33 %
//   borderline   : LTV 80-90 % OU  charges 33-38 %
//   nonfundable  : LTV > 90 %   OU  charges > 38 %

export type AffordabilityState = 'incomplete' | 'standard' | 'borderline' | 'nonfundable'

export interface Affordability {
  ltv: number
  charges: number
  state: AffordabilityState
  /** Revenu minimal pour repasser standard (null si la LTV l'empêche). */
  revenuMin: number | null
  /** Hypothèque maximale pour repasser standard. */
  hypothequeMax: number
}

const AMORT_YEARS = 15

/** Amortissement annuel : part de l'hypothèque au-dessus de 65 % de la valeur. */
export function amortissementAnnuel(montant: number, valeur: number): number {
  return valeur > 0 ? Math.max(0, (montant - 0.65 * valeur) / AMORT_YEARS) : 0
}

/** Charges théoriques annuelles (avant division par le revenu). */
export function chargesAnnuelles(montant: number, valeur: number): number {
  return montant * 0.05 + valeur * 0.01 + amortissementAnnuel(montant, valeur)
}

export function computeAffordability(
  montant: number,
  valeur: number,
  revenu: number
): Affordability {
  if (!(montant > 0) || !(valeur > 0) || !(revenu > 0)) {
    return { ltv: 0, charges: 0, state: 'incomplete', revenuMin: null, hypothequeMax: 0 }
  }

  const ltv = montant / valeur
  const charges = chargesAnnuelles(montant, valeur) / revenu

  let state: AffordabilityState
  if (ltv <= 0.8 && charges <= 0.33) state = 'standard'
  else if (ltv > 0.9 || charges > 0.38) state = 'nonfundable'
  else state = 'borderline'

  // Revenu minimal pour charges ≤ 33 % (n'aide pas si la LTV est le problème).
  const revenuMin = ltv <= 0.8 ? chargesAnnuelles(montant, valeur) / 0.33 : null

  // Hypothèque maximale : min(plafond LTV 80 %, plafond charges 33 %).
  const capLtv = 0.8 * valeur
  const capNoAmort = (0.33 * revenu - 0.01 * valeur) / 0.05
  const capCharges =
    capNoAmort <= 0.65 * valeur
      ? capNoAmort
      : (0.33 * revenu - 0.01 * valeur + (0.65 * valeur) / AMORT_YEARS) / (0.05 + 1 / AMORT_YEARS)
  const hypothequeMax = Math.max(0, Math.min(capLtv, capCharges))

  return { ltv, charges, state, revenuMin, hypothequeMax }
}
