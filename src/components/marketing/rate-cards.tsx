import { getTranslations } from 'next-intl/server'
import { formatDate, formatRate } from '@/lib/format'
import type { WidgetRates } from '@/components/marketing/home-lead-widget'

// Bandeau des trois taux phares sous le hero — SARON / 10 ans / 5 ans,
// alimenté par la table des taux de référence (modèle hypotheke.ch).
export async function RateCards({
  rates,
  updatedAt,
}: {
  rates: WidgetRates
  updatedAt: Date | null
}) {
  const t = await getTranslations('home.rateCards')

  const cards = [
    { label: t('saronLabel'), sub: t('saronSub'), rate: rates.saron ?? 0.9, featured: false },
    { label: t('tenYears'), sub: t('fixedSub'), rate: rates.fixed[10] ?? 1.75, featured: true },
    { label: t('fiveYears'), sub: t('fixedSub'), rate: rates.fixed[5] ?? 1.3, featured: false },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={
            card.featured
              ? 'border-pilot-600 rounded-2xl border bg-white p-6 text-center shadow-sm'
              : 'border-line rounded-2xl border bg-white p-6 text-center'
          }
        >
          <p className="font-display text-lg font-semibold">{card.label}</p>
          <p className="text-ink-500 text-xs">{card.sub}</p>
          <p className="text-data text-pilot-700 mt-2 text-4xl sm:text-5xl">
            {formatRate(card.rate)}
          </p>
          {card.featured && updatedAt ? (
            <p className="text-ink-400 text-data mt-2 text-xs">
              {t('updated', { date: formatDate(updatedAt) })}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// Rangée de prêteurs — PLACEHOLDERS typographiques en attendant les vrais
// logos (les noms seront remplacés par les partenaires réels).
const LENDER_PLACEHOLDERS = ['UBS', 'Zürich', 'BEKB | BCBE', 'Raiffeisen', 'AXA', 'Generali', 'BCV']

export async function LendersRow() {
  const t = await getTranslations('home.lenders')

  return (
    <div className="text-center">
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {LENDER_PLACEHOLDERS.map((name) => (
          <li
            key={name}
            className="text-ink-400 font-display text-lg font-bold tracking-tight select-none"
            aria-hidden
          >
            {name}
          </li>
        ))}
      </ul>
      <p className="text-ink-500 mt-3 text-sm">{t('more')}</p>
    </div>
  )
}
