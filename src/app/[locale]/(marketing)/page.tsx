import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { prisma } from '@/lib/prisma'
import { CallbackDialog } from '@/components/marketing/callback-dialog'
import { HomeLeadWidget, type WidgetRates } from '@/components/marketing/home-lead-widget'
import { OpenCalcButton } from '@/components/marketing/open-calc-button'
import { LendersRow, RateCards } from '@/components/marketing/rate-cards'
import { RateSubscribe } from '@/components/marketing/rate-subscribe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Taux du jour pour le bandeau et le widget (repli si la table est vide).
async function getWidgetRates(): Promise<WidgetRates> {
  try {
    const rows = await prisma.referenceRate.findMany()
    const fixed: Record<number, number> = {}
    let saron: number | null = null
    for (const rate of rows) {
      if (rate.type === 'SARON') saron = Number(rate.rate)
      else fixed[rate.termYears] = Number(rate.rate)
    }
    fixed[15] ??= fixed[10] !== undefined ? Math.round((fixed[10] + 0.25) * 100) / 100 : 2.0
    return { saron, fixed }
  } catch {
    return { saron: 0.9, fixed: { 5: 1.3, 10: 1.75, 15: 2.0 } }
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const rates = await getWidgetRates()

  return (
    <>
      {/* Hero deux colonnes : titre + CTA à gauche, calculateur à droite */}
      <section className="mx-auto max-w-[1240px] px-4 pt-[3.75rem] pb-10 sm:px-6 md:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6 lg:pt-6">
            <p className="text-pilot-600 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('hero.overline')}
            </p>
            <h1 className="font-display text-3xl leading-[1.18] font-bold md:text-5xl">
              {t.rich('hero.title', {
                hl: (chunks) => <span className="text-pilot-600">{chunks}</span>,
              })}
            </h1>
            <p className="text-ink-700 text-lg leading-normal">{t('hero.subtitle')}</p>
            <div className="pt-2">
              <OpenCalcButton label={t('hero.cta')} />
            </div>
          </div>

          {/* Calculateur : bien, hypothèque, revenu, NPA → offres par durée */}
          <Suspense fallback={null}>
            <HomeLeadWidget rates={rates} />
          </Suspense>
        </div>

        {/* Prêteurs au-dessus, puis le bandeau des 3 taux (SARON / 10 / 5 ans) */}
        <div className="mt-14">
          <LendersRow />
        </div>

        <div className="mt-16">
          <RateCards rates={rates} />
        </div>

        {/* Abonnement aux mises à jour de taux */}
        <div className="mt-16">
          <RateSubscribe />
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
