import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { Card, CardContent } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'renew' })
  return {
    title: t('hero.title'),
    description: t('hero.subtitle'),
    alternates: localizedAlternates('/renouveler', locale as Locale),
  }
}

export default async function RenewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('renew')

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-20">
      <div className="max-w-2xl space-y-6">
        <p className="text-ambre-700 text-xs font-semibold uppercase tracking-[0.08em]">
          {t('hero.overline')}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-[1.1] md:text-5xl">
          {t('hero.title')}
        </h1>
        <p className="text-ink-700 text-lg leading-relaxed">{t('hero.subtitle')}</p>
      </div>
      <Card className="mt-12 max-w-2xl">
        <CardContent className="text-ink-500 py-12 text-center text-sm">
          {t('placeholder')}
        </CardContent>
      </Card>
    </section>
  )
}
