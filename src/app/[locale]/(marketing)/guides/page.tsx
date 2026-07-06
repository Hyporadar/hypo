import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { GUIDES } from '@/lib/guides'
import { localizedAlternates } from '@/lib/seo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.guides' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates('/guides', locale as Locale),
  }
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('content.guides')
  const l = locale as Locale

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <div className="max-w-2xl space-y-4">
        <h1 className="font-display text-3xl leading-[1.1] font-semibold md:text-5xl">
          {t('title')}
        </h1>
        <p className="text-ink-700 leading-relaxed">{t('subtitle')}</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {GUIDES.map((guide) => (
          <Card key={guide.slug} className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-display text-lg leading-snug">{guide.titles[l]}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-5 text-sm">
              <p className="text-ink-700 leading-relaxed">{guide.descriptions[l]}</p>
              <Link
                href={{ pathname: '/guides/[slug]', params: { slug: guide.slug } }}
                className="text-pilot-700 inline-flex items-center gap-1 font-medium hover:underline"
              >
                {t('readMore')}
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
