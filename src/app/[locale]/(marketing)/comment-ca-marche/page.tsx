import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CreditCard, PiggyBank, Scale } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'

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

// Conteneur horizontal du design (frame 1280 − 56px de marge).
const WRAP = 'mx-auto w-full max-w-[1180px] px-6 md:px-14'

// Les deux CTA en pilule (échéance = vert plein, achat = contour blanc).
function CtaPills({ renew, buy }: { renew: string; buy: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={{ pathname: '/', query: { funnel: 'renouvellement' } }}
        className="bg-pilot-600 hover:bg-pilot-700 inline-flex h-12 items-center rounded-full px-7 text-[15px] font-semibold text-white transition-colors"
      >
        {renew}
      </Link>
      <Link
        href={{ pathname: '/', query: { funnel: 'achat' } }}
        className="border-line-strong text-ink-900 hover:bg-surface-alt inline-flex h-12 items-center rounded-full border bg-white px-7 text-[15px] font-semibold transition-colors"
      >
        {buy}
      </Link>
    </div>
  )
}

const WHY_ICONS = [CreditCard, PiggyBank, Scale] as const

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('howItWorks')

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ([1, 2, 3, 4] as const).map((i) => ({
      '@type': 'Question',
      name: t(`faq.q${i}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq.a${i}`) },
    })),
  }

  const steps = [1, 2, 3] as const
  const stepAnim = ['hr-p1', 'hr-p2', 'hr-p3']
  const textAnim = ['hr-t1', 'hr-t2', 'hr-t3']

  const whyItems = [
    { title: t('whyFree.whoTitle'), body: t('whyFree.who') },
    { title: t('whyFree.howMuchTitle'), body: t('whyFree.howMuch') },
    { title: t('whyFree.whyItWorksTitle'), body: t('whyFree.whyItWorks') },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className={`${WRAP} pt-14 pb-14 md:pt-20 md:pb-16`}>
        <p className="text-pilot-700 mb-5 text-xs font-semibold tracking-[0.12em] uppercase">
          {t('hero.overline')}
        </p>
        <h1 className="font-display max-w-[760px] text-[34px] leading-[1.06] font-medium tracking-[-0.025em] md:text-[52px]">
          {t('hero.title')}
        </h1>
        <p className="text-ink-700 mt-6 mb-8 max-w-[620px] text-lg leading-[1.6]">
          {t('hero.subtitle')}
        </p>
        <CtaPills renew={t('cta.renew')} buy={t('cta.buy')} />
      </section>

      {/* Trois étapes — frise animée */}
      <section className={`${WRAP} pb-16`}>
        <h2 className="font-display mb-11 text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
          {t('steps.title')}
        </h2>
        <div className="relative">
          {/* Piste + progression animée (desktop uniquement) */}
          <div className="bg-line absolute top-5 right-5 left-5 hidden h-0.5 md:block" />
          <div
            className="bg-pilot-600 absolute top-5 left-5 hidden h-0.5 max-w-[calc(100%-40px)] md:block"
            style={{ animation: 'hr-line 12s ease-in-out infinite' }}
          />
          <div className="relative grid gap-11 md:grid-cols-3">
            {steps.map((i, idx) => (
              <div key={i}>
                <div
                  className="border-pilot-600 bg-paper text-pilot-700 relative z-[1] flex size-10 items-center justify-center rounded-full border-[1.5px] font-mono text-sm font-medium"
                  style={{ animation: `${stepAnim[idx]} 12s ease infinite` }}
                >
                  0{i}
                </div>
                <div style={{ animation: `${textAnim[idx]} 12s ease infinite` }}>
                  <h3 className="font-display mt-[18px] mb-2 text-lg font-semibold">
                    {t(`steps.step${i}Title`)}
                  </h3>
                  <p className="text-ink-700 text-[15px] leading-[1.55]">
                    {t(`steps.step${i}Body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi c'est gratuit */}
      <section className="border-line border-y bg-white">
        <div className={`${WRAP} py-16`}>
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-[72px]">
            <div>
              <h2 className="font-display mb-3.5 text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
                {t('whyFree.title')}
              </h2>
              <p className="text-ink-500 text-[15px] leading-[1.55]">{t('whyFree.subtitle')}</p>
            </div>
            <div className="flex flex-col">
              {whyItems.map((item, idx) => {
                const Icon = WHY_ICONS[idx]
                return (
                  <div
                    key={item.title}
                    className={`border-line grid grid-cols-[40px_1fr] gap-5 ${
                      idx === 0 ? 'pb-6' : idx === whyItems.length - 1 ? 'pt-6' : 'py-6'
                    } ${idx < whyItems.length - 1 ? 'border-b' : ''}`}
                  >
                    <span className="bg-pilot-50 border-pilot-200 flex size-10 items-center justify-center rounded-full border">
                      <Icon className="text-pilot-700 size-[18px]" strokeWidth={2} />
                    </span>
                    <div>
                      <div className="font-display mb-1.5 text-lg font-semibold">{item.title}</div>
                      <p className="text-ink-700 text-[15px] leading-[1.55]">{item.body}</p>
                    </div>
                  </div>
                )
              })}
              <div className="bg-pilot-50 border-pilot-200 text-pilot-900 mt-6 mb-6 rounded-xl border px-[22px] py-[18px] text-[15px] leading-[1.6] font-medium">
                {t('whyFree.neverSold')}
              </div>
              <CtaPills renew={t('cta.renew')} buy={t('cta.buy')} />
            </div>
          </div>
        </div>
      </section>

      {/* Ce que la comparaison rapporte, en chiffres */}
      <section className={`${WRAP} py-12`}>
        <div className="bg-pilot-700 rounded-[20px] px-8 py-12 text-[#f7f4ec] shadow-[0_2px_6px_rgba(13,58,46,0.12),0_18px_44px_rgba(13,58,46,0.22)] md:px-14 md:py-[52px]">
          <h2 className="font-display mb-9 text-[24px] font-medium tracking-[-0.015em] md:text-[28px]">
            {t('proof.title')}
          </h2>
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <div className="text-pilot-200 font-mono text-[44px] leading-none font-medium md:text-[56px]">
                {t('proof.gapStat')}
              </div>
              <p className="mt-4 max-w-[440px] text-[15px] leading-[1.6] opacity-85">
                {t('proof.gapLabel')}
              </p>
            </div>
            <div>
              <div className="text-pilot-200 font-mono text-[44px] leading-none font-medium md:text-[56px]">
                {t('proof.compareStat')}
              </div>
              <p className="mt-4 max-w-[440px] text-[15px] leading-[1.6] opacity-85">
                {t('proof.compareLabel')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${WRAP} pt-4 pb-16`}>
        <h2 className="font-display mb-9 text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
          {t('faq.title')}
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {([1, 2, 3, 4] as const).map((i) => (
            <div
              key={i}
              className="border-line rounded-xl border bg-white px-8 py-7 shadow-[0_1px_2px_rgba(33,30,26,0.05),0_4px_16px_rgba(33,30,26,0.06)]"
            >
              <h3 className="font-display mb-2.5 text-[17px] font-semibold">{t(`faq.q${i}`)}</h3>
              <p className="text-ink-700 text-[15px] leading-[1.55]">{t(`faq.a${i}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className={`${WRAP} pb-[72px]`}>
        <h2 className="font-display mb-7 max-w-[560px] text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
          {t('cta.title')}
        </h2>
        <CtaPills renew={t('cta.renew')} buy={t('cta.buy')} />
      </section>
    </>
  )
}
