import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { PartnerGainsSimulator, PartnerSignupForm } from '@/components/marketing/partner-signup'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.partnersPublic' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates('/partenaires', locale as Locale),
  }
}

// Recrutement public des apporteurs B2B (agents immobiliers, fiduciaires).
export default async function PartnersPublicPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('content.partnersPublic')

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <div className="max-w-2xl space-y-4">
        <h1 className="font-display text-3xl leading-[1.1] font-semibold md:text-5xl">
          {t('title')}
        </h1>
        <p className="text-ink-700 text-lg leading-relaxed">{t('subtitle')}</p>
      </div>

      <ol className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
        {([1, 2, 3] as const).map((i) => (
          <li key={i} className="border-line rounded-xl border bg-white p-5">
            <p className="text-data text-pilot-600 text-sm">0{i}</p>
            <p className="text-ink-700 mt-2 text-sm leading-relaxed">{t(`how${i}`)}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <PartnerGainsSimulator />
        <PartnerSignupForm />
      </div>
    </section>
  )
}
