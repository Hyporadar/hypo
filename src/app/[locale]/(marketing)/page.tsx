import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CalendarClock, FileCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { prisma } from '@/lib/prisma'
import { CallbackDialog } from '@/components/marketing/callback-dialog'
import { HomeLeadWidget, type WidgetRates } from '@/components/marketing/home-lead-widget'
import { OpenCalcButton } from '@/components/marketing/open-calc-button'
import { LendersRow, RateCards } from '@/components/marketing/rate-cards'
import { RateSubscribe } from '@/components/marketing/rate-subscribe'

// Conteneur : largeur de la maquette (frame 1280) avec 56px de marge.
const WRAP = 'mx-auto w-full max-w-[1280px] px-6 md:px-14'

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

const Stars = ({ className = '' }: { className?: string }) => (
  <span className={`text-amber-500 tracking-[2px] ${className}`} aria-hidden>
    ★★★★★
  </span>
)

// Avis clients (carrousel « Ils nous font confiance »). Nom / note / couleur
// sont indépendants de la langue ; la citation vient des messages (trust.reviews).
const REVIEW_META = [
  { n: 'Claire D.', i: 'CD', r: '5,0', c: '#1B6B52' },
  { n: 'Marc B.', i: 'MB', r: '4,5', c: '#155843' },
  { n: 'Sophie M.', i: 'SM', r: '5,0', c: '#2E7D64' },
  { n: 'Nicolas R.', i: 'NR', r: '4,8', c: '#0D3A2E' },
  { n: 'Isabelle T.', i: 'IT', r: '4,9', c: '#3A8A6E' },
  { n: 'David F.', i: 'DF', r: '5,0', c: '#1B6B52' },
  { n: 'Laurent P.', i: 'LP', r: '4,5', c: '#155843' },
  { n: 'Anne V.', i: 'AV', r: '5,0', c: '#2E7D64' },
  { n: 'Julien S.', i: 'JS', r: '4,7', c: '#0D3A2E' },
  { n: 'Mélanie H.', i: 'MH', r: '5,0', c: '#3A8A6E' },
  { n: 'Pierre G.', i: 'PG', r: '4,5', c: '#1B6B52' },
]

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const rates = await getWidgetRates()

  const steps = [1, 2, 3] as const
  const stepAnim = ['hr-p1', 'hr-p2', 'hr-p3']
  const textAnim = ['hr-t1', 'hr-t2', 'hr-t3']

  const reviewQuotes = t.raw('trust.reviews') as string[]
  const testimonials = REVIEW_META.map((m, i) => ({ ...m, q: reviewQuotes[i] ?? '' }))

  return (
    <>
      {/* Hero : texte + CTA à gauche, calculateur à droite, logos en marquee */}
      <section className={`${WRAP} pt-14 pb-14 md:pt-[72px]`}>
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="text-pilot-700 mb-5 text-xs font-semibold tracking-[0.12em] uppercase">
              {t('hero.overline')}
            </p>
            <h1 className="font-display text-[34px] leading-[1.06] font-medium tracking-[-0.025em] md:text-[52px]">
              {t.rich('hero.title', {
                hl: (chunks) => <span className="text-pilot-600">{chunks}</span>,
              })}
            </h1>
            <p className="text-ink-700 mt-6 mb-8 max-w-[520px] text-lg leading-[1.6]">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <OpenCalcButton label={t('hero.cta')} />
              <span className="inline-flex items-center gap-2">
                <Stars className="text-base" />
                <span className="font-mono text-sm font-medium">4,9/5</span>
                <span className="text-ink-500 text-[13px]">{t('hero.reviews')}</span>
              </span>
            </div>
          </div>

          <Suspense fallback={null}>
            <HomeLeadWidget rates={rates} />
          </Suspense>
        </div>

        <div className="mt-10">
          <LendersRow />
        </div>
      </section>

      {/* Trois taux phares */}
      <section className={`${WRAP} pb-11`}>
        <RateCards rates={rates} />
      </section>

      {/* Comment ça marche — frise animée */}
      <section className={`${WRAP} pt-4 pb-14`}>
        <h2 className="font-display mb-11 text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
          {t('steps.title')}
        </h2>
        <div className="relative">
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

      {/* Abonnement aux mises à jour de taux */}
      <section className={`${WRAP} pb-12`}>
        <RateSubscribe />
      </section>

      {/* Ils nous font confiance — carrousel d'avis */}
      <section className="py-4">
        <div className={`${WRAP} mb-8 flex items-baseline justify-between`}>
          <h2 className="font-display text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
            {t('trust.title')}
          </h2>
          <span className="inline-flex items-center gap-2">
            <Stars className="text-[15px]" />
            <span className="font-mono text-sm font-medium">4,9/5</span>
            <span className="text-ink-500 hidden text-[13px] sm:inline">{t('trust.average')}</span>
          </span>
        </div>
        <div className="overflow-hidden [-webkit-mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <div
            className="flex w-max gap-5"
            style={{ animation: 'hr-marquee 90s linear infinite' }}
          >
            {[...testimonials, ...testimonials].map((rev, idx) => (
              <div
                key={idx}
                className="border-line w-[340px] shrink-0 rounded-xl border bg-white px-[26px] py-[22px] shadow-[0_1px_2px_rgba(33,30,26,0.05),0_4px_16px_rgba(33,30,26,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <Stars className="text-sm" />
                  <span className="font-mono text-[13px] font-medium">{rev.r}</span>
                </div>
                <p className="text-ink-700 my-4 text-[15px] leading-[1.55]">{rev.q}</p>
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-paper flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ background: rev.c }}
                  >
                    {rev.i}
                  </span>
                  <span className="text-[13px] font-semibold">{rev.n}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* La transparence, noir sur blanc — carte verte */}
      <section className={`${WRAP} py-12`}>
        <div className="bg-pilot-700 flex flex-col gap-6 rounded-[20px] px-8 py-12 text-[#f7f4ec] shadow-[0_2px_6px_rgba(13,58,46,0.12),0_18px_44px_rgba(13,58,46,0.22)] md:flex-row md:items-center md:justify-between md:px-14 md:py-[52px]">
          <div className="max-w-[640px]">
            <h2 className="font-display text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
              {t('transparency.title')}
            </h2>
            <p className="mt-3.5 text-base leading-[1.6] opacity-85">{t('transparency.body')}</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-3">
            <Link
              href="/comment-ca-marche"
              className="inline-flex h-11 items-center rounded-full border border-[#f7f4ec]/40 px-[22px] text-sm font-semibold text-[#f7f4ec] transition-colors hover:bg-[#f7f4ec]/10"
            >
              {t('transparency.more')}
            </Link>
            <CallbackDialog triggerClassName="bg-paper text-pilot-900 hover:bg-paper/90 h-11 rounded-full border-transparent px-[22px] text-sm font-semibold" />
          </div>
        </div>
      </section>

      {/* Par où commencer ? — deux cartes vers les funnels */}
      <section className={`${WRAP} border-line border-b pt-4 pb-16`}>
        <h2 className="font-display mb-9 text-[26px] font-medium tracking-[-0.015em] md:text-[32px]">
          {t('routing.title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border-line rounded-[20px] border bg-white px-8 py-9 shadow-[0_1px_2px_rgba(33,30,26,0.04),0_8px_24px_rgba(33,30,26,0.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(33,30,26,0.07),0_18px_40px_rgba(33,30,26,0.10)]">
            <div className="bg-pilot-50 border-pilot-200 mb-5 flex size-12 items-center justify-center rounded-[14px] border">
              <FileCheck className="text-pilot-700 size-[22px]" strokeWidth={2} />
            </div>
            <h3 className="font-display text-xl font-semibold">{t('routing.buyTitle')}</h3>
            <p className="text-ink-700 mt-2.5 mb-6 max-w-[440px] text-[15px] leading-[1.55]">
              {t('routing.buyBody')}
            </p>
            <OpenCalcButton
              funnel="achat"
              label={t('routing.buyCta')}
              className="h-11 rounded-full px-6 text-sm font-semibold"
            />
          </div>
          <div className="border-line rounded-[20px] border bg-white px-8 py-9 shadow-[0_1px_2px_rgba(33,30,26,0.04),0_8px_24px_rgba(33,30,26,0.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(33,30,26,0.07),0_18px_40px_rgba(33,30,26,0.10)]">
            <div className="bg-pilot-50 border-pilot-200 mb-5 flex size-12 items-center justify-center rounded-[14px] border">
              <CalendarClock className="text-pilot-700 size-[22px]" strokeWidth={2} />
            </div>
            <h3 className="font-display text-xl font-semibold">{t('routing.renewTitle')}</h3>
            <p className="text-ink-700 mt-2.5 mb-6 max-w-[440px] text-[15px] leading-[1.55]">
              {t('routing.renewBody')}
            </p>
            <OpenCalcButton
              funnel="renouvellement"
              label={t('routing.renewCta')}
              variant="outline"
              className="border-pilot-600 text-pilot-700 h-11 rounded-full px-6 text-sm font-semibold"
            />
          </div>
        </div>
      </section>
    </>
  )
}
