'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronUp, Landmark, PiggyBank, Umbrella } from 'lucide-react'
import { formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CalibrationResult, CalibTerm } from '@/lib/dossier/calibration'

const LENDER_ICONS = {
  BANQUE: Landmark,
  ASSURANCE: Umbrella,
  CAISSE_PENSION: PiggyBank,
} as const

const TERMS: CalibTerm[] = ['saron', 5, 10, 15]

// Chiffre animé discrètement quand la valeur change.
function AnimatedRate({ value }: { value: number }) {
  const [flash, setFlash] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 600)
      return () => clearTimeout(timer)
    }
  }, [value])
  return (
    <span
      className={cn(
        'text-data text-xl transition-colors duration-500',
        flash ? 'text-ambre-600' : 'text-pilot-700'
      )}
    >
      {formatRate(value)}
    </span>
  )
}

// Panneau offres PERMANENT : colonne droite sticky (desktop) / bandeau bas
// dépliable (mobile). Fourchettes par type de prêteur, recalculées à chaque
// réponse ; « estimation » → « fourchette calibrée » quand le dossier est complet.
export function OffersPanel({
  calibration,
  savingsPerYear,
}: {
  calibration: CalibrationResult | null
  savingsPerYear?: string | null
}) {
  const t = useTranslations('wizard.offers')
  const [term, setTerm] = useState<CalibTerm>(10)
  const [mobileOpen, setMobileOpen] = useState(false)

  const offers =
    calibration?.offers.filter((o) => o.term === term).sort((a, b) => a.min - b.min) ?? []

  const content = (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{t('title')}</h2>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            calibration?.calibrated ? 'bg-pilot-100 text-pilot-700' : 'bg-surface-alt text-ink-500'
          )}
        >
          {calibration?.calibrated ? t('calibrated') : t('estimate')}
        </span>
      </div>

      {/* Sélecteur de durée */}
      <div role="radiogroup" aria-label={t('duration')} className="flex flex-wrap gap-1.5">
        {TERMS.map((option) => (
          <button
            key={String(option)}
            type="button"
            role="radio"
            aria-checked={term === option}
            onClick={() => setTerm(option)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              term === option
                ? 'border-pilot-600 bg-pilot-600 text-white'
                : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
            )}
          >
            {option === 'saron' ? 'SARON' : t('years', { years: option })}
          </button>
        ))}
      </div>

      {/* Fourchettes par type de prêteur */}
      <ul className="space-y-2.5">
        {offers.map((offer) => {
          const Icon = LENDER_ICONS[offer.lenderType]
          return (
            <li
              key={offer.lenderType}
              className="border-line flex items-center gap-3 rounded-xl border bg-white p-3.5"
            >
              <span className="bg-pilot-50 text-pilot-700 flex size-9 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4.5" strokeWidth={1.8} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{t(`lenderTypes.${offer.lenderType}`)}</p>
                <p className="text-ink-500 text-xs">
                  {t('from')} <AnimatedRate value={offer.min} /> – {formatRate(offer.max)}
                </p>
              </div>
            </li>
          )
        })}
        {offers.length === 0 ? (
          <li className="text-ink-500 py-6 text-center text-sm">{t('empty')}</li>
        ) : null}
      </ul>

      {savingsPerYear ? (
        <p className="text-ink-700 text-sm">
          {t('savings')} <span className="text-data text-pilot-700">{savingsPerYear}</span>{' '}
          {t('perYear')}
        </p>
      ) : null}
      <p className="text-ink-400 text-xs leading-relaxed">
        {calibration?.calibrated ? t('noteCalibrated') : t('noteEstimate')}
      </p>
    </div>
  )

  return (
    <>
      {/* Desktop : colonne droite sticky */}
      <aside id="offres" className="sticky top-24 hidden h-fit scroll-mt-24 lg:block">
        {content}
      </aside>

      {/* Mobile : bandeau bas dépliable */}
      <div className="border-line fixed inset-x-0 bottom-0 z-30 border-t bg-white shadow-[0_-4px_12px_rgba(33,30,26,0.06)] lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-3"
        >
          <span className="text-sm font-medium">
            {t('title')}{' '}
            {offers[0] ? (
              <span className="text-data text-pilot-700">
                {t('from')} {formatRate(offers[0].min)}
              </span>
            ) : null}
          </span>
          <ChevronUp className={cn('size-4 transition-transform', mobileOpen && 'rotate-180')} />
        </button>
        {mobileOpen ? <div className="max-h-[60vh] overflow-auto px-5 pb-6">{content}</div> : null}
      </div>
    </>
  )
}
