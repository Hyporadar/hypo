import { prisma } from '@/lib/prisma'

// Valeur de repli si la table des taux est vide ou la base indisponible :
// les landings doivent rester fonctionnelles (résultat instantané).
export const FALLBACK_FIXED_10Y = 1.75

/** Taux de référence fixe 10 ans — l'ancre « marché » affichée au client. */
export async function getReferenceRate10y(): Promise<number> {
  try {
    const rate = await prisma.referenceRate.findUnique({
      where: { type_termYears: { type: 'FIXE', termYears: 10 } },
    })
    return rate ? Number(rate.rate) : FALLBACK_FIXED_10Y
  } catch {
    return FALLBACK_FIXED_10Y
  }
}
