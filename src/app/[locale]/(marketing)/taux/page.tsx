import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate, formatRate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { loadTodayRates } from '@/server/rates/update'
import { localizedAlternates } from '@/lib/seo'
import { Button } from '@/components/ui/button'

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

// LA page de trafic : le tableau des taux du jour + historique + FAQ.
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
        <div className="max-w-2xl space-y-4">
          <h1 className="font-display text-3xl leading-[1.1] font-semibold md:text-5xl">
            {t('title')}
          </h1>
          <p className="text-ink-700 leading-relaxed">{t('subtitle')}</p>
          {lastUpdate ? (
            <p className="text-data text-ink-500 text-sm">
              {t('updated', { date: formatDate(lastUpdate) })}
            </p>
          ) : null}
        </div>

        <div className="mt-10 max-w-2xl">
          {/* Tableau des taux */}
          <div className="border-line overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line text-ink-500 border-b text-left text-xs">
                  <th className="px-5 py-3 font-medium">{t('duration')}</th>
                  <th className="px-5 py-3 text-right font-medium">{t('rate')}</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr
                    key={`${rate.type}-${rate.termYears}`}
                    className="border-line border-b last:border-0"
                  >
                    <td className="px-5 py-3">
                      {rate.type === 'SARON' ? t('saron') : t('fixed', { years: rate.termYears })}
                    </td>
                    <td className="text-data px-5 py-3 text-right text-base">
                      {formatRate(Number(rate.rate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-ink-500 border-line border-t px-5 py-3 text-xs leading-relaxed">
              {t('snbNote')}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/renouveler">{t('ctaRenew')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/acheter">{t('ctaBuy')}</Link>
          </Button>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="font-display text-2xl font-semibold">{t('faqTitle')}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {faqEntries.map((entry) => (
              <div key={entry.q} className="border-line rounded-xl border bg-white p-5">
                <h3 className="font-display font-semibold">{entry.q}</h3>
                <p className="text-ink-700 mt-2 text-sm leading-relaxed">{entry.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
