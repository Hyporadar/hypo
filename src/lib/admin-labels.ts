// Libellés français du panel interne.

export const STATUT_LABELS: Record<string, string> = {
  NOUVEAU: 'Nouveau',
  CONTACTE: 'Contacté',
  RDV: 'RDV',
  DOSSIER_EN_COURS: 'Dossier en cours',
  DOSSIER_COMPLET: 'Dossier complet',
  ENVOYE_PARTENAIRE: 'Envoyé partenaire',
  OFFRES_RECUES: 'Offres reçues',
  SIGNE: 'Signé',
  PERDU: 'Perdu',
  NURTURING: 'Nurturing',
}

export const FUNNEL_LABELS: Record<string, string> = {
  ACHAT: 'Achat',
  RENOUVELLEMENT_CHAUD: 'Renouv. chaud',
  RENOUVELLEMENT_FROID: 'Renouv. froid',
}

export const SIGNAL_LABELS: Record<string, string> = {
  CALLBACK_DEMANDE: 'Rappel demandé',
  ABANDON_DOSSIER: 'Abandon de dossier',
  OFFRES_NON_LUES: 'Offres non lues',
  OFFRE_EXPIRE_BIENTOT: 'Offre expire bientôt',
  ENTREE_FENETRE: 'Entrée en fenêtre',
  GROSSE_ECONOMIE: 'Grosse économie',
}

export const PIPELINE_ORDER = [
  'NOUVEAU',
  'CONTACTE',
  'RDV',
  'DOSSIER_EN_COURS',
  'DOSSIER_COMPLET',
  'ENVOYE_PARTENAIRE',
  'OFFRES_RECUES',
  'SIGNE',
] as const

/** Durée relative compacte : 4 min, 3 h, 2 j. */
export function formatAge(from: Date, to: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} j`
}
