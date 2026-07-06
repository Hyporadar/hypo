import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatRate } from '@/lib/format'
import { getReferenceRate10y } from '@/lib/rates'
import { MortgageTimeline } from '@/components/brand/mortgage-timeline'
import { CallbackDialog } from '@/components/marketing/callback-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const refRate10y = await getReferenceRate10y()

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <div className="max-w-2xl space-y-6">
          <p className="text-pilot-600 text-xs font-semibold tracking-[0.08em] uppercase">
            {t('hero.overline')}
          </p>
          <h1 className="font-display text-4xl leading-[1.05] font-semibold md:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed">{t('hero.subtitle')}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/renouveler">{t('hero.ctaRenew')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/acheter">{t('hero.ctaBuy')}</Link>
            </Button>
          </div>
        </div>
        <div className="mt-16 max-w-2xl">
          <MortgageTimeline startLabel="2024" windowLabel="12–18" endLabel="2034" />
        </div>
      </section>

      {/* Le chiffre du jour */}
      <section className="border-line border-y">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-pilot-600 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('dailyRate.overline')}
            </p>
            <p className="text-ink-700 mt-1 text-sm">{t('dailyRate.label')}</p>
          </div>
          <p className="text-data text-pilot-700 text-4xl sm:text-5xl">{formatRate(refRate10y)}</p>
          <p className="text-ink-500 max-w-[220px] text-xs leading-relaxed">
            {t('dailyRate.note')}
          </p>
        </div>
      </section>

      {/* Routage vers les deux funnels */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">{t('routing.title')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t('routing.buyTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="text-ink-700 flex flex-1 flex-col justify-between gap-6 text-sm leading-relaxed">
              {t('routing.buyBody')}
              <Button asChild className="self-start">
                <Link href="/acheter">
                  {t('routing.buyCta')}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t('routing.renewTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="text-ink-700 flex flex-1 flex-col justify-between gap-6 text-sm leading-relaxed">
              {t('routing.renewBody')}
              <Button asChild className="self-start">
                <Link href="/renouveler">
                  {t('routing.renewCta')}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Étapes */}
      <section className="bg-surface-alt/60 border-line border-y">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{t('steps.title')}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {([1, 2, 3] as const).map((i) => (
              <Card key={i}>
                <CardHeader>
                  <p className="text-data text-pilot-600 text-sm">0{i}</p>
                  <CardTitle className="font-display text-lg">{t(`steps.step${i}Title`)}</CardTitle>
                </CardHeader>
                <CardContent className="text-ink-700 text-sm leading-relaxed">
                  {t(`steps.step${i}Body`)}
                </CardContent>
              </Card>
            ))}
          </div>
          <Link
            href="/comment-ca-marche"
            className="text-pilot-700 mt-6 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {t('steps.more')}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Transparence + rappel immédiat */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              {t('transparency.title')}
            </h2>
            <p className="text-ink-700 leading-relaxed">{t('transparency.body')}</p>
            <Link
              href="/comment-ca-marche"
              className="text-pilot-700 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              {t('transparency.more')}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <CallbackDialog />
        </div>
      </section>
    </>
  )
}
