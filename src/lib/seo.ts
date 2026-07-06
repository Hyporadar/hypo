import type { Metadata } from 'next'
import { getPathname } from '@/i18n/navigation'
import { routing, type Locale, type StaticPathname } from '@/i18n/routing'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// canonical + hreflang (x-default = fr) pour une page publique donnée.
export function localizedAlternates(
  pathname: StaticPathname,
  locale: Locale
): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const l of routing.locales) {
    languages[l] = `${BASE_URL}${getPathname({ href: pathname, locale: l })}`
  }
  languages['x-default'] = languages[routing.defaultLocale]

  return {
    canonical: `${BASE_URL}${getPathname({ href: pathname, locale })}`,
    languages,
  }
}

export { BASE_URL }
