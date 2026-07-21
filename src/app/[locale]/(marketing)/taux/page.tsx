import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate, formatRate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { loadTodayRates } from '@/server/rates/update'
import { localizedAlternates } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.rates' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates('/taux', locale as Locale),
  }
}

const WRAP = 'mx-auto w-full max-w-[1180px] px-6 md:px-14'
const POPULAR_TERM = 5

export default async function RatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('content.rates')

  const [rates, today] = await Promise.all([
    prisma.referenceRate
      .findMany({ orderBy: [{ type: 'desc' }, { termYears: 'asc' }] })
      .catch(() => []),
    loadTodayRates(),
  ])
  const lastUpdate = today.date ? new Date(today.date) : null

  const saron = rates.find((r) => r.type === 'SARON')
  const fixed = rates
    .filter((r) => r.type !== 'SARON')
    .sort((a, b) => a.termYears - b.termYears)
  const maxRate = Math.max(
    ...fixed.map((r) => Number(r.rate)),
    saron ? Number(saron.rate) : 0,
    0.01
  )
  const barW = (v: number) => `${Math.max(8, Math.round((v / maxRate) * 100))}%`

  const faqEntries = [1, 2, 3].map((i) => ({
    q: t(`faq${i}q` as 'faq1q'),
    a: t(`faq${i}a` as 'faq1a'),
  }))
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: { '@type': 'Answer', text: e.a },
    })),
  }

  // Colonnes : libellé | barre (desktop) | (taux + pastille)
  const ROW = 'grid items-center gap-4 sm:grid-cols-[150px_1fr_auto] sm:gap-6'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero + badge « mis à jour » */}
      <section className={`${WRAP} pt-14 pb-12 md:pt-20`}>
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-pilot-700 mb-5 text-xs font-semibold tracking-[0.12em] uppercase">
              {t('overline')}
            </p>
            <h1 className="font-display max-w-[680px] text-[34px] leading-[1.06] font-medium tracking-[-0.025em] md:text-[52px]">
              {t('title')}
            </h1>
            <p className="text-ink-700 mt-6 max-w-[560px] text-lg leading-[1.6]">{t('subtitle')}</p>
          </div>
          {lastUpdate ? (
            <span className="bg-pilot-50 border-pilot-200 text-pilot-700 inline-flex h-9 items-center gap-2 self-start rounded-full border px-4 font-mono text-[13px] font-medium whitespace-nowrap md:self-end">
              <span className="bg-pilot-600 size-2 rounded-full" />
              {t('updated', { date: formatDate(lastUpdate) })}
            </span>
          ) : null}
        </div>
      </section>

      {/* Échelle des taux de référence */}
      <section className={`${WRAP} pb-6`}>
        <div className="border-line flex flex-col gap-[18px] rounded-[20px] border bg-white px-6 py-8 shadow-[0_1px_2px_rgba(33,30,26,0.04),0_8px_24px_rgba(33,30,26,0.06)] md:px-10 md:py-9">
          {saron ? (
            <div
              className={`${ROW} bg-pilot-50 border-pilot-200 -mx-2 rounded-xl border px-2 py-3.5 sm:-mx-[18px] sm:px-[18px]`}
            >
              <span className="text-[15px] font-semibold">
                {t('saron')}
                <span className="text-ink-500 block text-xs font-normal">{t('saronSub')}</span>
              </span>
              <span className="bg-line relative hidden h-2 rounded sm:block">
                <span
                  className="bg-pilot-600 absolute inset-y-0 left-0 rounded"
                  style={{ width: barW(Number(saron.rate)) }}
                />
              </span>
              <span className="flex items-center justify-end gap-3">
                <span className="text-pilot-700 font-mono text-xl font-medium">
                  {formatRate(Number(saron.rate))}
                </span>
                <span className="text-pilot-700 border-pilot-200 rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium">
                  {t('pillVariable')}
                </span>
              </span>
            </div>
          ) : null}

          {fixed.map((r) => {
            const popular = r.termYears === POPULAR_TERM
            return (
              <div key={`${r.type}-${r.termYears}`} className={ROW}>
                <span className={`text-[15px] ${popular ? 'font-semibold' : ''}`}>
                  {t('fixed', { years: r.termYears })}
                </span>
                <span className="bg-surface-alt relative hidden h-2 rounded sm:block">
                  <span
                    className={`absolute inset-y-0 left-0 rounded ${popular ? 'bg-pilot-500' : 'bg-pilot-200'}`}
                    style={{ width: barW(Number(r.rate)) }}
                  />
                </span>
                <span className="flex items-center justify-end gap-3">
                  <span className="font-mono text-[17px] font-medium">
                    {formatRate(Number(r.rate))}
                  </span>
                  {popular ? (
                    <span className="text-amber-700 bg-amber-50 border-amber-100 rounded-full border px-2.5 py-1 text-[11px] font-medium">
                      {t('pillPopular')}
                    </span>
                  ) : null}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-ink-500 mt-3.5 text-[13px] leading-[1.5]">{t('refNote')}</p>
      </section>

      {/* CTA */}
      <section className={`${WRAP} pt-6 pb-14`}>
        <div className="flex flex-wrap gap-3">
          <Link
            href={{ pathname: '/', query: { funnel: 'renouvellement' } }}
            className="bg-pilot-600 hover:bg-pilot-700 inline-flex h-12 items-center rounded-full px-7 text-[15px] font-semibold text-white transition-colors"
          >
            {t('ctaRenew')}
          </Link>
          <Link
            href={{ pathname: '/', query: { funnel: 'achat' } }}
            className="border-line-strong text-ink-900 hover:bg-surface-alt inline-flex h-12 items-center rounded-full border bg-white px-7 text-[15px] font-semibold transition-colors"
          >
            {t('ctaBuy')}
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${WRAP} pb-[72px]`}>
        <h2 className="font-display mb-9 text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
          {t('faqTitle')}
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {faqEntries.map((entry) => (
            <div
              key={entry.q}
              className="border-line rounded-xl border bg-white px-8 py-7 shadow-[0_1px_2px_rgba(33,30,26,0.05),0_4px_16px_rgba(33,30,26,0.06)]"
            >
              <h3 className="font-display mb-2.5 text-[17px] font-semibold">{entry.q}</h3>
              <p className="text-ink-700 text-[15px] leading-[1.55]">{entry.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
