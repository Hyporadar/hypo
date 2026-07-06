import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

// Détection Accept-Language au premier visit, puis cookie NEXT_LOCALE (bascule manuelle persistée).
export default createMiddleware(routing)

export const config = {
  // Tout sauf : /admin (français only, hors routing localisé), API, assets Next et fichiers statiques.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
}
