import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CircleOff } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { Button } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.transparency' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates('/transparence', locale as Locale),
  }
}

// Page statique de confiance : comment HypoPilot est payé, montants types.
export default async function TransparencyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('content.transparency')

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <div className="max-w-2xl space-y-4">
        <h1 className="font-display text-3xl leading-[1.1] font-semibold md:text-5xl">
          {t('title')}
        </h1>
        <p className="text-ink-700 text-lg leading-relaxed">{t('subtitle')}</p>
      </div>

      <div className="mt-12 max-w-2xl space-y-10">
        {(['s1', 's2', 's3'] as const).map((key) => (
          <div key={key}>
            <h2 className="font-display text-xl font-semibold">{t(`${key}Title`)}</h2>
            <p className="text-ink-700 mt-2 leading-relaxed">{t(`${key}Body`)}</p>
          </div>
        ))}

        <div>
          <h2 className="font-display text-xl font-semibold">{t('s4Title')}</h2>
          <ul className="mt-3 space-y-2">
            {t('s4Items')
              .split('|')
              .map((item) => (
                <li key={item} className="text-ink-700 flex items-center gap-2.5">
                  <CircleOff className="text-erreur size-4 shrink-0" strokeWidth={1.8} />
                  {item}
                </li>
              ))}
          </ul>
        </div>

        <Button asChild size="lg">
          <Link href="/renouveler">{t('cta')}</Link>
        </Button>
      </div>
    </section>
  )
}
