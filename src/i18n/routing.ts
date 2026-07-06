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
