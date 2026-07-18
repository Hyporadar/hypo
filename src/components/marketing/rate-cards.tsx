import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { formatRate } from '@/lib/format'
import type { WidgetRates } from '@/components/marketing/home-lead-widget'

// Bandeau des trois taux phares sous le hero — SARON / 10 ans / 5 ans,
// alimenté par la table des taux de référence (modèle hypotheke.ch).
export async function RateCards({ rates }: { rates: WidgetRates }) {
  const t = await getTranslations('home.rateCards')

  const cards = [
    { label: t('saronLabel'), sub: t('saronSub'), rate: rates.saron ?? 0.9, featured: false },
    { label: t('tenYears'), sub: t('fixedSub'), rate: rates.fixed[10] ?? 1.75, featured: true },
    { label: t('fiveYears'), sub: t('fixedSub'), rate: rates.fixed[5] ?? 1.3, featured: false },
  ]

  return (
    <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={
            card.featured
              ? 'border-pilot-600 rounded-xl border bg-white p-4 text-center shadow-sm'
              : 'border-line rounded-xl border bg-white p-4 text-center'
          }
        >
          <p className="font-display text-base font-semibold">{card.label}</p>
          <p className="text-ink-500 text-xs">{card.sub}</p>
          <p className="text-data text-pilot-700 mt-1 text-2xl sm:text-3xl">
            {formatRate(card.rate)}
          </p>
        </div>
      ))}
    </div>
  )
}

// Rangée de prêteurs — logos indicatifs (à remplacer par les partenaires réels).
const LENDERS = [
  { name: 'UBS', file: 'ubs.svg', h: 24 },
  { name: 'Zurich', file: 'zurich.svg', h: 30 },
  { name: 'BEKB', file: 'bekb.svg', h: 24 },
  { name: 'Raiffeisen', file: 'raiffeisen.svg', h: 20 },
  { name: 'AXA', file: 'axa.svg', h: 28 },
  { name: 'Generali', file: 'generali.svg', h: 22 },
  { name: 'Migros Bank', file: 'migros-bank.svg', h: 18 },
  { name: 'PostFinance', file: 'postfinance.svg', h: 20 },
  { name: 'BCV', file: 'bcv.svg', h: 22 },
]

export async function LendersRow() {
  const t = await getTranslations('home.lenders')

  const logo = (lender: (typeof LENDERS)[number], prefix: string) => (
    <li key={prefix + lender.name} className="shrink-0 opacity-80">
      <Image
        src={`/lenders/${lender.file}`}
        alt={lender.name}
        width={Math.round(lender.h * 3.5)}
        height={lender.h}
        className="w-auto"
        style={{ height: lender.h }}
      />
    </li>
  )

  return (
    <>
      {/* Desktop : logos sur plusieurs lignes centrées */}
      <div className="hidden text-center md:block">
        <ul className="flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
          {LENDERS.map((lender) => logo(lender, 'd-'))}
          <li className="text-ink-500 text-sm font-medium">{t('more')}</li>
        </ul>
      </div>

      {/* Mobile : une seule ligne qui défile automatiquement (piste dupliquée) */}
      <div className="overflow-hidden md:hidden">
        <ul className="hp-marquee flex w-max items-center gap-x-9">
          {LENDERS.map((lender) => logo(lender, 'a-'))}
          <li key="a-more" className="text-ink-500 shrink-0 pr-9 text-sm font-medium">
            {t('more')}
          </li>
          {LENDERS.map((lender) => logo(lender, 'b-'))}
          <li key="b-more" className="text-ink-500 shrink-0 pr-9 text-sm font-medium" aria-hidden>
            {t('more')}
          </li>
        </ul>
      </div>
    </>
  )
}
