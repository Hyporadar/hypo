import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { FileText, Scale, Zap } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'howItWorks' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates('/comment-ca-marche', locale as Locale),
  }
}

const STEP_ICONS = [FileText, Zap, Scale] as const

// LA page de vente du concept — pour celui qui hésite avant le formulaire.
export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('howItWorks')

  // schema.org FAQPage pour les extraits enrichis
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ([1, 2, 3, 4] as const).map((i) => ({
      '@type': 'Question',
      name: t(`faq.q${i}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq.a${i}`) },
    })),
  }

  const ctaBlock = (
    <div className="flex flex-wrap gap-3">
      <Button asChild size="lg">
        <Link href="/renouveler">{t('cta.renew')}</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/acheter">{t('cta.buy')}</Link>
      </Button>
    </div>
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <div className="max-w-2xl space-y-6">
          <p className="text-pilot-600 text-xs font-semibold tracking-[0.08em] uppercase">
            {t('hero.overline')}
          </p>
          <h1 className="font-display text-4xl leading-[1.05] font-semibold md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed">{t('hero.subtitle')}</p>
          {ctaBlock}
        </div>
      </section>

      {/* Les 3 étapes */}
      <section className="bg-surface-alt/60 border-line border-y">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{t('steps.title')}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {([1, 2, 3] as const).map((i) => {
              const Icon = STEP_ICONS[i - 1]
              return (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="bg-pilot-50 text-pilot-700 flex size-10 items-center justify-center rounded-full">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                      <p className="text-data text-pilot-600 text-sm">0{i}</p>
                    </div>
                    <CardTitle className="font-display pt-2 text-lg">
                      {t(`steps.step${i}Title`)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-ink-700 text-sm leading-relaxed">
                    {t(`steps.step${i}Body`)}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pourquoi c'est gratuit */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="max-w-2xl space-y-5">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{t('whyFree.title')}</h2>
          <p className="text-ink-700 leading-relaxed">{t('whyFree.who')}</p>
          <p className="text-ink-700 leading-relaxed">{t('whyFree.howMuch')}</p>
          <p className="text-ink-700 leading-relaxed">{t('whyFree.whyItWorks')}</p>
          <p className="border-pilot-600 text-ink-900 border-l-2 pl-4 leading-relaxed font-medium">
            {t('whyFree.neverSold')}
          </p>
          {ctaBlock}
        </div>
      </section>

      {/* Preuve */}
      <section className="bg-pilot-700 text-[#F7F4EC]">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{t('proof.title')}</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-data text-pilot-200 text-5xl md:text-6xl">{t('proof.gapStat')}</p>
              <p className="text-pilot-100 mt-3 max-w-md text-sm leading-relaxed">
                {t('proof.gapLabel')}
              </p>
            </div>
            <div>
              <p className="text-data text-pilot-200 text-5xl md:text-6xl">
                {t('proof.compareStat')}
              </p>
              <p className="text-pilot-100 mt-3 max-w-md text-sm leading-relaxed">
                {t('proof.compareLabel')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">{t('faq.title')}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {([1, 2, 3, 4] as const).map((i) => (
            <div key={i} className="border-line rounded-xl border bg-white p-6">
              <h3 className="font-display text-lg font-semibold">{t(`faq.q${i}`)}</h3>
              <p className="text-ink-700 mt-2 text-sm leading-relaxed">{t(`faq.a${i}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-line border-t">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <h2 className="font-display max-w-xl text-2xl font-semibold md:text-3xl">
            {t('cta.title')}
          </h2>
          <div className="mt-6">{ctaBlock}</div>
        </div>
      </section>
    </>
  )
}
