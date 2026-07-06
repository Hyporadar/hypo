import 'server-only'
import type { Funnel } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── Données de l'espace client ────────────────────────────────────────
// Un lead appartient au client s'il est rattaché à son compte (userId) OU
// s'il porte son email (funnel public rempli avant la création du compte).

export function ownLeadsWhere(userId: string, email: string) {
  return { OR: [{ userId }, { email: email.toLowerCase() }] }
}

/** Le dossier « courant » du client : son lead le plus récent hors PERDU. */
export async function getClientLead(userId: string, email: string) {
  return prisma.lead.findFirst({
    where: { ...ownLeadsWhere(userId, email), status: { not: 'PERDU' } },
    orderBy: { createdAt: 'desc' },
    include: {
      mortgage: true,
      purchaseProject: true,
      certificate: true,
      documents: { orderBy: { createdAt: 'desc' } },
      offers: { orderBy: { rate: 'asc' } },
    },
  })
}

/** L'hypothèque surveillée du client (rattachée au compte ou à un de ses leads). */
export async function getClientMortgage(userId: string, email: string) {
  return prisma.mortgage.findFirst({
    where: {
      OR: [{ userId }, { lead: ownLeadsWhere(userId, email) }],
    },
    orderBy: { updatedAt: 'desc' },
    include: { lead: { select: { id: true, funnel: true, status: true } } },
  })
}

/** Le certificat le plus récent du client (funnel achat). */
export async function getClientCertificate(userId: string, email: string) {
  return prisma.certificate.findFirst({
    where: { lead: ownLeadsWhere(userId, email) },
    orderBy: { createdAt: 'desc' },
    include: { lead: { select: { status: true } } },
  })
}

// Documents requis par funnel — la base du « il manque : … ».
export const REQUIRED_DOCUMENTS: Record<Funnel, string[]> = {
  ACHAT: ['piece-identite', 'certificat-salaire', 'taxation', 'attestation-2e-pilier'],
  RENOUVELLEMENT_CHAUD: ['piece-identite', 'contrat-hypothecaire', 'taxation'],
  RENOUVELLEMENT_FROID: ['piece-identite', 'contrat-hypothecaire', 'taxation'],
}

export function missingDocuments(
  funnel: Funnel,
  documents: Array<{ type: string; verificationStatus: string }>
): string[] {
  const provided = new Set(
    documents.filter((d) => d.verificationStatus !== 'REFUSE').map((d) => d.type)
  )
  return REQUIRED_DOCUMENTS[funnel].filter((t) => !provided.has(t))
}
