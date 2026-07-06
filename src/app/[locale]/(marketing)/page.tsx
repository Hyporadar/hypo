import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { MortgageTimeline } from '@/components/brand/mortgage-timeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-6 py-20 md:py-28">
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
        </div>
      </section>

      {/* Transparence */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="max-w-2xl space-y-4">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">
            {t('transparency.title')}
          </h2>
          <p className="text-ink-700 leading-relaxed">{t('transparency.body')}</p>
        </div>
      </section>
    </>
  )
}
