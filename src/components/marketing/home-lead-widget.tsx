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

interface AmountRowProps {
  id: string
  label: string
  value: number
  max: number
  onChange: (v: number) => void
}

// Ligne minimaliste : libellé à gauche, champ CHF à droite (sans curseur).
function AmountRow({ id, label, value, max, onChange }: AmountRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-ink-700 text-sm">
        {label}
      </label>
      <div className="relative w-48 shrink-0">
        <input
          id={id}
          inputMode="numeric"
          placeholder="0"
          className="border-input text-data focus-visible:ring-ring/50 placeholder:text-ink-400 h-11 w-full rounded-full border bg-white pr-14 pl-4 text-right text-base focus-visible:ring-3 focus-visible:outline-none"
          value={value === 0 ? '' : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '')
            onChange(Math.min(max, digits ? Number(digits) : 0))
          }}
        />
        <span className="text-ink-500 text-data pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm">
          CHF
        </span>
      </div>
    </div>
  )
}

// Écart moyen constaté entre meilleure et pire offre : 0,72% → une offre
// moyenne se situe ~0,36 point au-dessus de la référence.
const AVERAGE_MARKET_PREMIUM = 0.36

const TERMS = ['saron', 5, 10, 15] as const
type Term = (typeof TERMS)[number]

// Primes indicatives par type de prêteur ET par durée : les banques dominent
// le court/moyen terme, les caisses de pension les longues durées.
const CATEGORIES = [
  {
    key: 'bank',
    type: 'banque',
    icon: Landmark,
    premiums: { saron: 0, 5: 0, 10: 0, 15: 0.1 } as Record<Term, number>,
  },
  {
    key: 'insurance',
    type: 'assurance',
    icon: Umbrella,
    premiums: { saron: 0.12, 5: 0.1, 10: 0.08, 15: 0.05 } as Record<Term, number>,
  },
  {
    key: 'pension',
    type: 'caisse-pension',
    icon: PiggyBank,
    premiums: { saron: 0.15, 5: 0.12, 10: 0.05, 15: -0.02 } as Record<Term, number>,
  },
] as const

export function HomeLeadWidget({ rates }: { rates: WidgetRates }) {
  const t = useTranslations('home.leadWidget')
  const router = useRouter()
  const [propertyValue, setPropertyValue] = useState(0)
  const [mortgage, setMortgage] = useState(0)
  const [income, setIncome] = useState(0)
  const [plz, setPlz] = useState('')
  const [term, setTerm] = useState<Term>(10)

  const termRate = (option: Term) =>
    option === 'saron' ? (rates.saron ?? 0.9) : (rates.fixed[option] ?? rates.fixed[10] ?? 1.75)
  const selectedRate = termRate(term)
  const horizonYears = term === 'saron' ? 10 : term
  const showOffers = mortgage >= 100_000

  // Les offres se recalculent selon la durée choisie, triées par taux.
  const offers = [...CATEGORIES]
    .map((category) => {
      const premium = category.premiums[term]
      const rate = Math.round((selectedRate + premium) * 100) / 100
      const savings = Math.max(
        0,
        Math.round(((AVERAGE_MARKET_PREMIUM - premium) / 100) * mortgage * horizonYears)
      )
      return { ...category, rate, savings }
    })
    .sort((a, b) => a.rate - b.rate)

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
      <CardContent className="p-6 sm:p-8">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t('title')}</h2>
          <p className="text-ink-700 mt-1">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-6 max-w-md space-y-3">
          <AmountRow
            id="hw-property"
            label={t('propertyValue')}
            value={propertyValue}
            max={3_000_000}
            onChange={(v) => {
              setPropertyValue(v)
              if (mortgage === 0 && v > 0) setMortgage(Math.round((v * 0.65) / 25_000) * 25_000)
            }}
          />
          <AmountRow
            id="hw-mortgage"
            label={t('mortgage')}
            value={mortgage}
            max={2_400_000}
            onChange={setMortgage}
          />
          <AmountRow
            id="hw-income"
            label={t('income')}
            value={income}
            max={500_000}
            onChange={setIncome}
          />
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="hw-plz" className="text-ink-700 text-sm">
              {t('plz')}
            </label>
            <Input
              id="hw-plz"
              className="h-11 w-48 shrink-0 rounded-full bg-white px-4"
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
            <div className="mt-6 grid gap-4 lg:grid-cols-[250px_1fr]">
              {/* Sélecteur de durée — change les offres à droite */}
              <ul className="border-line divide-line h-fit divide-y overflow-hidden rounded-xl border bg-white">
                {TERMS.map((option) => {
                  const active = term === option
                  return (
                    <li key={String(option)}>
                      <button
                        type="button"
                        onClick={() => setTerm(option)}
                        aria-pressed={active}
                        className={
                          active
                            ? 'bg-pilot-50 flex w-full items-center justify-between px-4 py-3 text-left'
                            : 'hover:bg-surface-alt flex w-full items-center justify-between px-4 py-3 text-left transition-colors'
                        }
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
                          <span className="text-data text-lg">{formatRate(termRate(option))}</span>
                          <span
                            className={
                              active
                                ? 'border-pilot-600 size-3.5 rounded-full border-4 bg-white'
                                : 'border-pilot-200 bg-pilot-50 size-3.5 rounded-full border-2'
                            }
                          />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Propositions par type de prêteur — recalculées selon la durée */}
              <div className="space-y-3">
                {offers.map((offer) => {
                  const Icon = offer.icon
                  return (
                    <div
                      key={offer.key}
                      className="border-line flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-white p-4"
                    >
                      <span className="bg-pilot-50 text-pilot-700 flex size-10 shrink-0 items-center justify-center rounded-full">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-40 flex-1">
                        <p className="font-display font-semibold">{t(offer.key)}</p>
                        <p className="text-ink-500 mt-0.5 text-xs leading-relaxed">
                          {t(`${offer.key}Desc`)}
                        </p>
                      </div>
                      <p className="text-data text-xl">{formatRate(offer.rate)}</p>
                      <div className="text-right">
                        <p className="text-data text-pilot-700 text-lg">
                          {formatCHF(offer.savings)}
                        </p>
                        <p className="text-ink-500 text-xs">{t('savings')}</p>
                        <Button size="sm" className="mt-2" onClick={() => continueWith(offer.type)}>
                          {t('categoryCta')}
                          <ArrowRight data-icon="inline-end" />
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
