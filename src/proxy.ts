import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import { authConfig } from '@/lib/auth.config'
import { routing, type Locale } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)
const { auth } = NextAuth(authConfig)

const ADMIN_ROLES = new Set(['CLOSER', 'PARTNER', 'ADMIN'])

// Verrou pré-lancement : tout le site derrière un mot de passe (Basic Auth),
// actif uniquement si SITE_PASSWORD est défini. Retirer la variable rouvre le
// site. Les routes /api (dont le cron) ne sont pas concernées par le matcher.
const SITE_USER = process.env.SITE_USER ?? 'hyporadar'
function siteGate(req: Request): Response | undefined {
  const pw = process.env.SITE_PASSWORD
  if (!pw) return
  if (req.headers.get('authorization') === `Basic ${btoa(`${SITE_USER}:${pw}`)}`) return
  return new Response('Accès protégé', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HypoRadar", charset="UTF-8"' },
  })
}

// Slug de la page de connexion par locale (les pathnames sont traduits).
function loginPath(locale: Locale): string {
  const slugs = routing.pathnames['/connexion']
  return `/${locale}${slugs[locale]}`
}

export default auth((req) => {
  const gate = siteGate(req)
  if (gate) return gate

  const { nextUrl } = req
  const user = req.auth?.user

  // /verify/[id] — page publique de vérification des certificats (URL du QR,
  // identique dans toutes les langues, rendue dans la langue du certificat).
  if (nextUrl.pathname.startsWith('/verify/')) {
    return
  }

  // /campagne — panel de test (hors routing localisé), auth propre (cookie).
  if (nextUrl.pathname === '/campagne' || nextUrl.pathname.startsWith('/campagne/')) {
    return
  }

  // /admin — hors routing localisé (français uniquement), réservé CLOSER/PARTNER/ADMIN.
  if (nextUrl.pathname === '/admin' || nextUrl.pathname.startsWith('/admin/')) {
    if (!user) {
      return Response.redirect(new URL(loginPath(routing.defaultLocale), nextUrl))
    }
    if (!ADMIN_ROLES.has(user.role)) {
      return Response.redirect(new URL(`/${user.locale}/app`, nextUrl))
    }
    return
  }

  // /{locale}/app — espace client, connexion requise.
  const appMatch = nextUrl.pathname.match(/^\/(fr|de|it)\/app(?:\/|$)/)
  if (appMatch && !user) {
    return Response.redirect(new URL(loginPath(appMatch[1] as Locale), nextUrl))
  }

  // Détection Accept-Language au premier visit, cookie NEXT_LOCALE persisté.
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
