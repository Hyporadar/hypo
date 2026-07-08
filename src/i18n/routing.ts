import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'de', 'it'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  // Slugs traduits — le français fait foi, les clés internes sont les chemins fr.
  pathnames: {
    '/': '/',
    '/acheter': {
      fr: '/acheter',
      de: '/kaufen',
      it: '/comprare',
    },
    '/renouveler': {
      fr: '/renouveler',
      de: '/verlaengern',
      it: '/rinnovare',
    },
    '/comment-ca-marche': {
      fr: '/comment-ca-marche',
      de: '/so-funktionierts',
      it: '/come-funziona',
    },
    '/dossier': '/dossier',
    // Connexion par magic link (lien reçu par email) — slug technique stable.
    '/lien-magique/[token]': '/lien-magique/[token]',
    '/demande': {
      fr: '/demande',
      de: '/anfrage',
      it: '/richiesta',
    },
    '/taux': {
      fr: '/taux',
      de: '/zinsen',
      it: '/tassi',
    },
    '/guides': '/guides',
    '/guides/[slug]': '/guides/[slug]',
    '/transparence': {
      fr: '/transparence',
      de: '/transparenz',
      it: '/trasparenza',
    },
    '/partenaires': {
      fr: '/partenaires',
      de: '/partner',
      it: '/partner',
    },
    '/contact': '/contact',
    '/faq': '/faq',
    '/impressum': '/impressum',
    '/confidentialite': {
      fr: '/confidentialite',
      de: '/datenschutz',
      it: '/privacy',
    },
    '/cgu': {
      fr: '/cgu',
      de: '/agb',
      it: '/cg',
    },
    '/connexion': {
      fr: '/connexion',
      de: '/anmelden',
      it: '/accedi',
    },
    '/inscription': {
      fr: '/inscription',
      de: '/registrieren',
      it: '/registrati',
    },
    // Espace client : contenu localisé, slugs techniques stables.
    '/app': '/app',
    '/app/dossier': '/app/dossier',
    '/app/parrainage': '/app/parrainage',
    '/app/compte': '/app/compte',
  },
})

export type Locale = (typeof routing.locales)[number]
export type AppPathname = keyof typeof routing.pathnames
// Chemins sans paramètre dynamique — utilisables tels quels dans Link/sitemap.
export type StaticPathname = Exclude<AppPathname, '/guides/[slug]' | '/lien-magique/[token]'>
