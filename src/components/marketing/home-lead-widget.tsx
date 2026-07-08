'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Landmark, PiggyBank, Umbrella } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { formatCHF, formatRate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Le formulaire de lead de la home (modèle hypotheke.ch) : curseurs +
// NPA/localité, puis trois propositions par TYPE de prêteur (banques,
// assurances, caisses de pension). Chaque proposition redirige vers la
// page de demande détaillée en préremplissant le brouillon.

export interface WidgetRates {
  saron: number | null
  fixed: Record<number, number> // durée en années → taux
}

interface SliderRowProps {
  id: string
  label: string
  value: number
  max: number
  step: number
  onChange: (v: number) => void
}

function SliderRow({ id, label, value, max, step, onChange }: SliderRowProps) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[140px_170px_1fr] sm:gap-4">
      <label htmlFor={id} className="text-ink-700 text-sm">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          className="border-input text-data focus-visible:ring-ring/50 h-11 w-full rounded-full border bg-white pr-14 pl-4 text-right text-base focus-visible:ring-3 focus-visible:outline-none"
          value={value === 0 ? '0' : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '')
            onChange(Math.min(max, digits ? Number(digits) : 0))
          }}
        />
        <span className="text-ink-500 text-data pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm">
          CHF
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-pilot-600 h-2 w-full"
      />
    </div>
  )
}

// Écart moyen constaté entre meilleure et pire offre : 0,72% → une offre
// moyenne se situe ~0,36 point au-dessus de la référence.
const AVERAGE_MARKET_PREMIUM = 0.36

const CATEGORIES = [
  { key: 'bank', type: 'banque', icon: Landmark, premium: 0 },
  { key: 'insurance', type: 'assurance', icon: Umbrella, premium: 0.15 },
  { key: 'pension', type: 'caisse-pension', icon: PiggyBank, premium: 0.09 },
] as const

export function HomeLeadWidget({ rates }: { rates: WidgetRates }) {
  const t = useTranslations('home.leadWidget')
  const router = useRouter()
  const [propertyValue, setPropertyValue] = useState(0)
  const [mortgage, setMortgage] = useState(0)
  const [income, setIncome] = useState(0)
  const [plz, setPlz] = useState('')

  const baseRate = rates.fixed[10] ?? 1.75
  const showOffers = mortgage >= 100_000

  function continueWith(category: (typeof CATEGORIES)[number]['type']) {
    // Préremplit le brouillon partagé — la demande détaillée et le funnel
    // renouvellement repartent de ces montants sans ressaisie.
    try {
      window.localStorage.setItem(
        'hp-draft-renouvellement',
        JSON.stringify({
          draftId: crypto.randomUUID(),
          step: 0,
          values: {
            amount: mortgage || null,
            rate: '',
            lenderChoice: '',
            lenderOther: '',
            endMonth: '',
            propertyValue: propertyValue || null,
            name: '',
            email: '',
            phone: '',
            wantsCallback: false,
            plz: plz || null,
            income: income || null,
            lenderCategory: category,
          },
          attribution: {},
          updatedAt: new Date().toISOString(),
        })
      )
    } catch {
      // stockage indisponible : la demande partira vide
    }
    router.push({ pathname: '/demande', query: { type: category } })
  }

  return (
    <Card id="simulateur" className="border-line scroll-mt-24 shadow-sm">
      <CardContent className="p-6 sm:p-10">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t('title')}</h2>
          <p className="text-ink-700 mt-1">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl space-y-4">
          <SliderRow
            id="hw-property"
            label={t('propertyValue')}
            value={propertyValue}
            max={3_000_000}
            step={50_000}
            onChange={(v) => {
              setPropertyValue(v)
              if (mortgage === 0 && v > 0) setMortgage(Math.round((v * 0.65) / 25_000) * 25_000)
            }}
          />
          <SliderRow
            id="hw-mortgage"
            label={t('mortgage')}
            value={mortgage}
            max={2_400_000}
            step={25_000}
            onChange={setMortgage}
          />
          <SliderRow
            id="hw-income"
            label={t('income')}
            value={income}
            max={500_000}
            step={5_000}
            onChange={setIncome}
          />
          <div className="grid items-center gap-2 sm:grid-cols-[140px_1fr] sm:gap-4">
            <label htmlFor="hw-plz" className="text-ink-700 text-sm">
              {t('plz')}
            </label>
            <Input
              id="hw-plz"
              className="h-11 rounded-full bg-white px-4"
              placeholder={t('plzPlaceholder')}
              autoComplete="postal-code"
              value={plz}
              onChange={(e) => setPlz(e.target.value.slice(0, 60))}
            />
          </div>
        </div>

        {showOffers ? (
          <div className="mt-10">
            <p className="font-display text-center text-lg font-semibold">{t('categoriesTitle')}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {CATEGORIES.map((category) => {
                const Icon = category.icon
                const rate = Math.round((baseRate + category.premium) * 100) / 100
                const savings = Math.max(
                  0,
                  Math.round(((AVERAGE_MARKET_PREMIUM - category.premium) / 100) * mortgage)
                )
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => continueWith(category.type)}
                    className="border-line hover:border-pilot-600 group flex flex-col rounded-2xl border bg-white p-6 text-left transition-colors"
                  >
                    <span className="bg-pilot-50 text-pilot-700 flex size-11 items-center justify-center rounded-full">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                    <span className="font-display mt-4 text-lg font-semibold">
                      {t(category.key)}
                    </span>
                    <span className="text-ink-700 mt-1 flex-1 text-sm leading-relaxed">
                      {t(`${category.key}Desc`)}
                    </span>
                    <span className="text-data text-pilot-700 mt-4 text-3xl">
                      <span className="text-ink-500 mr-1.5 font-sans text-sm">{t('from')}</span>
                      {formatRate(rate)}
                    </span>
                    {savings > 0 ? (
                      <span className="text-ink-500 mt-1 text-xs">
                        {t('savings')} : <span className="text-data">{formatCHF(savings)}</span>{' '}
                        {t('perYear')}
                      </span>
                    ) : null}
                    <span className="text-pilot-700 mt-4 inline-flex items-center gap-1 text-sm font-medium group-hover:underline">
                      {t('categoryCta')}
                      <ArrowRight className="size-4" />
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-ink-400 mt-4 text-center text-xs leading-relaxed">
              {t('savingsNote')}
            </p>
          </div>
        ) : (
          <p className="text-ink-500 mt-8 text-center text-sm">{t('emptyHint')}</p>
        )}

        <p className="text-ink-700 mt-8 text-center text-sm">
          {t('buyHint')}{' '}
          <button
            type="button"
            onClick={() => router.push('/acheter')}
            className="text-pilot-700 font-medium underline-offset-4 hover:underline"
          >
            {t('buyCta')}
          </button>
        </p>
      </CardContent>
    </Card>
  )
}
