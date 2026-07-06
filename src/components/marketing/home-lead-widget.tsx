'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Landmark, PiggyBank, Umbrella } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { formatCHF, formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Le formulaire de lead de la home : curseurs + taux du jour par durée +
// propositions immédiates. Le CTA embarque les montants saisis dans le
// brouillon du funnel renouvellement (localStorage) pour préremplir.

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

const TERMS = ['saron', 5, 10, 15] as const
// Écart moyen constaté entre meilleure et pire offre : 0,72% → une offre
// moyenne se situe ~0,36 point au-dessus de la référence.
const AVERAGE_MARKET_PREMIUM = 0.36

export function HomeLeadWidget({ rates }: { rates: WidgetRates }) {
  const t = useTranslations('home.leadWidget')
  const router = useRouter()
  const [propertyValue, setPropertyValue] = useState(0)
  const [mortgage, setMortgage] = useState(0)
  const [income, setIncome] = useState(0)
  const [term, setTerm] = useState<(typeof TERMS)[number]>(10)

  const selectedRate =
    term === 'saron' ? (rates.saron ?? 0.9) : (rates.fixed[term] ?? rates.fixed[10] ?? 1.75)
  const horizonYears = term === 'saron' ? 10 : term
  const showOffers = mortgage >= 100_000

  const offers = useMemo(() => {
    const defs = [
      { key: 'bank', icon: Landmark, premium: 0 },
      { key: 'pension', icon: PiggyBank, premium: 0.09 },
      { key: 'insurance', icon: Umbrella, premium: 0.15 },
    ] as const
    return defs.map((def) => {
      const rate = Math.round((selectedRate + def.premium) * 100) / 100
      const savings = Math.max(
        0,
        Math.round(((AVERAGE_MARKET_PREMIUM - def.premium) / 100) * mortgage * horizonYears)
      )
      return { ...def, rate, savings }
    })
  }, [selectedRate, mortgage, horizonYears])

  function startRenewal() {
    // Préremplit le brouillon du funnel — l'utilisateur ne ressaisit rien.
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
          },
          attribution: {},
          updatedAt: new Date().toISOString(),
        })
      )
    } catch {
      // stockage indisponible : le funnel partira vide
    }
    router.push('/renouveler')
  }

  return (
    <Card className="border-line shadow-card">
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
        </div>

        {showOffers ? (
          <div className="mt-10">
            <p className="text-center text-lg">
              <span className="font-display font-semibold">{t('offersTitle', { count: 20 })}</span>
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
              {/* Sélecteur de durée + taux du jour */}
              <ul className="border-line divide-line h-fit divide-y overflow-hidden rounded-xl border bg-white">
                {TERMS.map((option) => {
                  const rate =
                    option === 'saron' ? (rates.saron ?? 0.9) : (rates.fixed[option] ?? 0)
                  const active = term === option
                  return (
                    <li key={String(option)}>
                      <button
                        type="button"
                        onClick={() => setTerm(option)}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
                          active ? 'bg-pilot-50' : 'hover:bg-surface-alt'
                        )}
                      >
                        <span>
                          <span className="block text-sm font-semibold">
                            {option === 'saron' ? 'SARON' : t('years', { years: option })}
                          </span>
                          <span className="text-ink-500 text-xs">
                            {option === 'saron' ? t('saronNote') : t('fixedNote')}
                          </span>
                        </span>
                        <span className="flex items-center gap-2.5">
                          <span className="text-data text-lg">{formatRate(rate)}</span>
                          <span
                            className={cn(
                              'size-3.5 rounded-full border-2',
                              active ? 'border-pilot-600 bg-white' : 'border-pilot-200 bg-pilot-100'
                            )}
                          />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Propositions */}
              <div className="space-y-3">
                {offers.map((offer) => {
                  const Icon = offer.icon
                  return (
                    <div
                      key={offer.key}
                      className="border-line flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border bg-white p-4"
                    >
                      <span className="bg-pilot-50 text-pilot-700 flex size-10 shrink-0 items-center justify-center rounded-full">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-36">
                        <p className="font-display font-semibold">{t(offer.key)}</p>
                        <ul className="text-ink-500 mt-1 space-y-0.5 text-xs">
                          <li className="flex items-center gap-1.5">
                            <Check className="text-pilot-600 size-3" /> {t('bullet1')}
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="text-pilot-600 size-3" /> {t('bullet2')}
                          </li>
                        </ul>
                      </div>
                      <p className="text-data text-xl">{formatRate(offer.rate)}</p>
                      <div className="ml-auto text-right">
                        <p className="text-data text-pilot-700 text-lg">
                          {formatCHF(offer.savings)}
                        </p>
                        <p className="text-ink-500 text-xs">{t('savings')}</p>
                        <Button size="sm" className="mt-2" onClick={startRenewal}>
                          {t('cta')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <p className="text-ink-400 text-xs leading-relaxed">{t('savingsNote')}</p>
              </div>
            </div>
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
