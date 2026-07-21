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
    // Mobile : « 10 ans » (featured) pleine largeur en haut, puis SARON + 5 ans
    // sur une ligne. Desktop : les trois côte à côte.
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-[20px] border bg-white px-6 py-7 text-center shadow-[0_1px_2px_rgba(33,30,26,0.04),0_8px_24px_rgba(33,30,26,0.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(33,30,26,0.07),0_18px_40px_rgba(33,30,26,0.10)] md:px-8 ${
            card.featured
              ? 'border-pilot-700 order-first col-span-2 border-[1.5px] md:order-none md:col-span-1'
              : 'border-line'
          }`}
        >
          <div className="text-lg font-semibold">{card.label}</div>
          <div className="text-ink-500 mt-1 text-[15px]">{card.sub}</div>
          <div className="text-pilot-700 mt-2.5 font-mono text-[40px] leading-[1.1] font-medium">
            {formatRate(card.rate)}
          </div>
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

// Ligne de prêteurs : marquee continu masqué sur les bords (cf. design).
export async function LendersRow() {
  const logo = (lender: (typeof LENDERS)[number], prefix: string) => (
    <li key={prefix + lender.name} className="shrink-0 opacity-80" aria-hidden={prefix !== 'a-'}>
      <Image
        src={`/lenders/${lender.file}`}
        alt={prefix === 'a-' ? lender.name : ''}
        width={Math.round(lender.h * 3.5)}
        height={lender.h}
        className="w-auto"
        style={{ height: lender.h }}
      />
    </li>
  )

  return (
    <div className="overflow-hidden [-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <ul
        className="flex w-max items-center gap-x-14"
        style={{ animation: 'hr-marquee 28s linear infinite' }}
      >
        {LENDERS.map((lender) => logo(lender, 'a-'))}
        {LENDERS.map((lender) => logo(lender, 'b-'))}
      </ul>
    </div>
  )
}
