import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.faqPage' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates('/faq', locale as Locale),
  }
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const tHow = await getTranslations('howItWorks.faq')
  const tPage = await getTranslations('content.faqPage')

  const entries = [
    ...([1, 2, 3, 4] as const).map((i) => ({ q: tHow(`q${i}`), a: tHow(`a${i}`) })),
    ...([5, 6] as const).map((i) => ({ q: tPage(`q${i}`), a: tPage(`a${i}`) })),
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: { '@type': 'Answer', text: e.a },
    })),
  }

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h1 className="font-display text-3xl font-semibold md:text-5xl">{tPage('title')}</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.q} className="border-line rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-semibold">{entry.q}</h2>
            <p className="text-ink-700 mt-2 text-sm leading-relaxed">{entry.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
