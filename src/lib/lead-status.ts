// Statuts de lead affichés au CLIENT, dans sa langue — libellés lisibles,
// sans jargon pipeline. Le panel /admin utilise les statuts bruts (français).
const LEAD_STATUS_LABELS: Record<string, Record<string, string>> = {
  fr: {
    NOUVEAU: 'Reçu',
    CONTACTE: 'En contact',
    RDV: 'Rendez-vous planifié',
    DOSSIER_EN_COURS: 'Dossier en cours',
    DOSSIER_COMPLET: 'Dossier complet',
    ENVOYE_PARTENAIRE: 'Envoyé aux prêteurs',
    OFFRES_RECUES: 'Offres reçues',
    SIGNE: 'Signé',
    NURTURING: 'Sous surveillance',
    PERDU: 'Clos',
  },
  de: {
    NOUVEAU: 'Eingegangen',
    CONTACTE: 'In Kontakt',
    RDV: 'Termin geplant',
    DOSSIER_EN_COURS: 'Dossier in Arbeit',
    DOSSIER_COMPLET: 'Dossier vollständig',
    ENVOYE_PARTENAIRE: 'An Kreditgeber gesendet',
    OFFRES_RECUES: 'Offerten erhalten',
    SIGNE: 'Unterschrieben',
    NURTURING: 'Unter Überwachung',
    PERDU: 'Geschlossen',
  },
  it: {
    NOUVEAU: 'Ricevuto',
    CONTACTE: 'In contatto',
    RDV: 'Appuntamento fissato',
    DOSSIER_EN_COURS: 'Dossier in corso',
    DOSSIER_COMPLET: 'Dossier completo',
    ENVOYE_PARTENAIRE: 'Inviato ai finanziatori',
    OFFRES_RECUES: 'Offerte ricevute',
    SIGNE: 'Firmato',
    NURTURING: 'Sotto sorveglianza',
    PERDU: 'Chiuso',
  },
}

export function leadStatusLabel(locale: string, status: string): string {
  return LEAD_STATUS_LABELS[locale]?.[status] ?? status
}
