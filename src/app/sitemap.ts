import type { MetadataRoute } from 'next'
import { getPathname } from '@/i18n/navigation'
import { routing, type StaticPathname } from '@/i18n/routing'
import { BASE_URL } from '@/lib/seo'

const PUBLIC_PATHS: StaticPathname[] = [
  '/',
  '/acheter',
  '/renouveler',
  '/comment-ca-marche',
  '/taux',
  '/guides',
  '/transparence',
  '/partenaires',
  '/contact',
  '/faq',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((pathname) => {
    const languages: Record<string, string> = {}
    for (const locale of routing.locales) {
      languages[locale] = `${BASE_URL}${getPathname({ href: pathname, locale })}`
    }
    return {
      url: languages[routing.defaultLocale]!,
      lastModified: new Date(),
      alternates: { languages },
    }
  })
}
