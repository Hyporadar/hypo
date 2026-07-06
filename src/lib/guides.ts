import type { Locale } from '@/i18n/routing'

// Registre des guides — les contenus vivent dans src/content/guides/*.mdx.
export interface GuideMeta {
  slug: string
  titles: Record<Locale, string>
  descriptions: Record<Locale, string>
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'renouveler-son-hypotheque',
    titles: {
      fr: 'Renouveler son hypothèque : le guide complet',
      de: 'Hypothek verlängern: der komplette Leitfaden',
      it: "Rinnovare l'ipoteca: la guida completa",
    },
    descriptions: {
      fr: 'Fenêtre de 12–18 mois, préavis, appel d’offres : tout ce qu’il faut savoir pour ne pas signer la première proposition venue.',
      de: 'Zeitfenster von 12–18 Monaten, Kündigungsfrist, Ausschreibung: alles Wichtige, um nicht den erstbesten Vorschlag zu unterschreiben.',
      it: 'Finestra di 12–18 mesi, disdetta, gara d’offerte: tutto ciò che serve per non firmare la prima proposta.',
    },
  },
  {
    slug: 'certificat-capacite-achat',
    titles: {
      fr: 'Le certificat de capacité d’achat expliqué',
      de: 'Das Tragbarkeitszertifikat erklärt',
      it: 'Il certificato di sostenibilità spiegato',
    },
    descriptions: {
      fr: 'Le document que les agents immobiliers exigent avant toute offre : ce qu’il contient, comment il se calcule, comment l’obtenir en 2 minutes.',
      de: 'Das Dokument, das Makler vor jedem Angebot verlangen: was es enthält, wie es berechnet wird und wie Sie es in 2 Minuten erhalten.',
      it: 'Il documento che le agenzie esigono prima di ogni offerta: cosa contiene, come si calcola, come ottenerlo in 2 minuti.',
    },
  },
  {
    slug: 'saron-ou-taux-fixe',
    titles: {
      fr: 'Hypothèque SARON ou taux fixe ?',
      de: 'SARON oder Festhypothek?',
      it: 'Ipoteca SARON o tasso fisso?',
    },
    descriptions: {
      fr: 'Moins cher mais fluctuant, ou verrouillé mais plus haut : l’arbitrage expliqué avec des chiffres, pas des slogans.',
      de: 'Günstiger aber schwankend, oder fixiert aber höher: die Abwägung mit Zahlen erklärt, nicht mit Slogans.',
      it: 'Più conveniente ma fluttuante, o bloccato ma più alto: la scelta spiegata con i numeri, non con gli slogan.',
    },
  },
]

export function getGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
