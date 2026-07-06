import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { GUIDES, getGuide } from '@/lib/guides'
import { BASE_URL } from '@/lib/seo'
import { getPathname } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => GUIDES.map((g) => ({ locale, slug: g.slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const guide = getGuide(slug)
  if (!guide) return {}
  const l = locale as Locale

  const languages: Record<string, string> = {}
  for (const loc of routing.locales) {
    languages[loc] =
      `${BASE_URL}${getPathname({ href: { pathname: '/guides/[slug]', params: { slug } }, locale: loc })}`
  }
  languages['x-default'] = languages[routing.defaultLocale]!

  return {
    title: guide.titles[l],
    description: guide.descriptions[l],
    alternates: {
      canonical: `${BASE_URL}${getPathname({ href: { pathname: '/guides/[slug]', params: { slug } }, locale: l })}`,
      languages,
    },
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const guide = getGuide(slug)
  if (!guide) notFound()
  const t = await getTranslations('home.hero')

  let MDX: React.ComponentType
  try {
    MDX = (await import(`@/content/guides/${slug}.${locale}.mdx`)).default
  } catch {
    notFound()
  }

  return (
    <article className="mx-auto max-w-2xl px-6 py-14 md:py-20">
      <MDX />
      <div className="border-line mt-12 flex flex-wrap gap-3 border-t pt-8">
        <Button asChild size="lg">
          <Link href="/renouveler">{t('ctaRenew')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/acheter">{t('ctaBuy')}</Link>
        </Button>
      </div>
    </article>
  )
}
