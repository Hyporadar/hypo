// Échéance grossière saisie sur le parcours court (branche renouvellement) :
// quatre tranches, sans date précise. Détermine le routage de la popup de fin
// (rappel téléphonique immédiat vs surveillance de l'échéance).

export const ECHEANCES = ['lt6', 'mid', 'gt18', 'unknown'] as const
export type Echeance = (typeof ECHEANCES)[number]

/**
 * Au-delà de 18 mois (ou échéance inconnue), il est trop tôt pour un rappel :
 * on propose de surveiller l'échéance et de prévenir au bon moment plutôt que
 * de demander le téléphone tout de suite.
 */
export function needsMonitoring(e: Echeance | null | undefined): boolean {
  return e === 'gt18' || e === 'unknown'
}
