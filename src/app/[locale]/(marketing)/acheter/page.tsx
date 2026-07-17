import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { DossierShort } from '@/components/marketing/dossier-short'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'buy' })
  return {
    title: t('hero.title'),
    description: t('hero.subtitle'),
    alternates: localizedAlternates('/acheter', locale as Locale),
  }
}

export default async function BuyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('buy')

  return (
    <section className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <p className="text-pilot-600 text-xs font-semibold tracking-[0.08em] uppercase">
          {t('hero.overline')}
        </p>
        <h1 className="font-display text-3xl leading-[1.1] font-semibold sm:text-4xl">
          {t('hero.title')}
        </h1>
        <p className="text-ink-700 leading-relaxed">{t('hero.subtitle')}</p>
      </div>
      <div className="mt-10">
        <DossierShort initialFunnel="ACHAT" />
      </div>
    </section>
  )
}
