import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, BadgePercent, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { robots: { index: false } }

// Landing de test : hero + un seul CTA vers le questionnaire (mode test).
export default async function LpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('testLp')

  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center md:py-24">
      <p className="bg-pilot-50 text-pilot-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
        <BadgePercent className="size-3.5" />
        {t('badge')}
      </p>
      <h1 className="font-display mt-5 text-3xl leading-[1.1] font-semibold sm:text-4xl md:text-5xl">
        {t('title')}
      </h1>
      <p className="text-ink-700 mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
        {t('subtitle')}
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href={`/${locale}/lp/questionnaire`}>
          {t('cta')}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <ul className="text-ink-700 mx-auto mt-10 flex max-w-md flex-col gap-3 text-left text-sm">
        {(['p1', 'p2', 'p3'] as const).map((key) => (
          <li key={key} className="flex items-center gap-2.5">
            <span className="bg-pilot-50 text-pilot-700 flex size-5 shrink-0 items-center justify-center rounded-full">
              {key === 'p1' ? (
                <ShieldCheck className="size-3" />
              ) : (
                <Check className="size-3" />
              )}
            </span>
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  )
}
