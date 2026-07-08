import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { prisma } from '@/lib/prisma'
import { CallbackDialog } from '@/components/marketing/callback-dialog'
import { HomeLeadWidget, type WidgetRates } from '@/components/marketing/home-lead-widget'
import { LendersRow, RateCards } from '@/components/marketing/rate-cards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Taux du jour pour le bandeau et le widget (repli si la table est vide).
async function getWidgetRates(): Promise<{ rates: WidgetRates; updatedAt: Date | null }> {
  try {
    const rows = await prisma.referenceRate.findMany()
    const fixed: Record<number, number> = {}
    let saron: number | null = null
    let updatedAt: Date | null = null
    for (const rate of rows) {
      if (rate.type === 'SARON') saron = Number(rate.rate)
      else fixed[rate.termYears] = Number(rate.rate)
      if (!updatedAt || rate.updatedAt > updatedAt) updatedAt = rate.updatedAt
    }
    fixed[15] ??= fixed[10] !== undefined ? Math.round((fixed[10] + 0.25) * 100) / 100 : 2.0
    return { rates: { saron, fixed }, updatedAt }
  } catch {
    return { rates: { saron: 0.9, fixed: { 5: 1.3, 10: 1.75, 15: 2.0 } }, updatedAt: null }
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const { rates, updatedAt } = await getWidgetRates()

  return (
    <>
      {/* Hero : titre, sous-titre, UN call-to-action (modèle hypotheke.ch) */}
      <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-10 md:pt-24">
        <div className="max-w-2xl space-y-6">
          <p className="text-pilot-600 text-xs font-semibold tracking-[0.08em] uppercase">
            {t('hero.overline')}
          </p>
          <h1 className="font-display text-4xl leading-[1.05] font-semibold md:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed">{t('hero.subtitle')}</p>
          <div className="pt-2">
            <Button asChild size="lg">
              <a href="#simulateur">{t('hero.cta')}</a>
            </Button>
          </div>
        </div>

        {/* Bandeau des 3 taux : SARON / 10 ans / 5 ans */}
        <div className="mt-14">
          <RateCards rates={rates} updatedAt={updatedAt} />
        </div>

        {/* Prêteurs (placeholders — logos réels à venir) */}
        <div className="mt-10">
          <LendersRow />
        </div>

        {/* L'outil : bien, hypothèque, revenu, NPA → 3 propositions */}
        <div className="mt-14">
          <HomeLeadWidget rates={rates} />
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
