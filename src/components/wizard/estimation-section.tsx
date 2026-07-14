'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Landmark, Loader2, PiggyBank, Umbrella } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CalibrationResult, CalibTerm } from '@/lib/dossier/calibration'
import type { DossierData } from '@/lib/dossier/schema'
import { FinalizeDialog } from '@/components/wizard/finalize-dialog'
import { Button } from '@/components/ui/button'

const LENDER_ICONS = { BANQUE: Landmark, ASSURANCE: Umbrella, CAISSE_PENSION: PiggyBank } as const
const TERMS: CalibTerm[] = ['saron', 5, 10, 15]

// Étape 4 : estimation du taux (fourchette calibrée à partir des réponses).
// Le CTA ouvre la popup de capture du lead — c'est là qu'on récupère
// vraiment email + téléphone pour revalider l'offre.
export function EstimationSection({
  funnel,
  data,
  dossierId,
  testMode = false,
}: {
  funnel: Funnel
  data: DossierData
  dossierId: string
  testMode?: boolean
}) {
  const t = useTranslations('wizard.estimation')
  const to = useTranslations('wizard.offers')
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState<CalibTerm>(10)
  const [finalizeOpen, setFinalizeOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/rates/calibrated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnel, data }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive) setCalibration(json as CalibrationResult | null)
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [funnel, data])

  const offers =
    calibration?.offers.filter((o) => o.term === term).sort((a, b) => a.min - b.min) ?? []
  const best = offers[0]

  return (
    <div className="space-y-4">
      <div className="border-line rounded-xl border bg-white p-6 sm:p-8">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t('title')}</h2>
          <p className="text-ink-500 mx-auto mt-1 max-w-md text-sm leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="text-ink-400 mt-8 flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : best ? (
          <>
            {/* Taux « dès X% » en grand */}
            <p className="mt-6 text-center">
              <span className="text-ink-500 text-sm">{to('from')} </span>
              <span className="text-data text-pilot-700 text-4xl font-semibold">
                {formatRate(best.min)}
              </span>
            </p>

            {/* Sélecteur de durée */}
            <div
              role="radiogroup"
              aria-label={to('duration')}
              className="mt-5 flex flex-wrap justify-center gap-1.5"
            >
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
                  {option === 'saron' ? 'SARON' : to('years', { years: option })}
                </button>
              ))}
            </div>

            {/* Fourchettes par type de prêteur */}
            <ul className="mx-auto mt-5 max-w-md space-y-2.5">
              {offers.map((offer) => {
                const Icon = LENDER_ICONS[offer.lenderType]
                return (
                  <li
                    key={offer.lenderType}
                    className="border-line flex items-center gap-3 rounded-xl border p-3.5"
                  >
                    <span className="bg-pilot-50 text-pilot-700 flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4.5" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{to(`lenderTypes.${offer.lenderType}`)}</p>
                      <p className="text-ink-500 text-xs">
                        {to('from')} {formatRate(offer.min)} – {formatRate(offer.max)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="text-ink-500 mt-6 text-center text-sm">{to('empty')}</p>
        )}

        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => setFinalizeOpen(true)}>
            {t('cta')}
            <ArrowRight data-icon="inline-end" />
          </Button>
          <p className="text-ink-500 mt-2 text-xs">{t('ctaHint')}</p>
        </div>
      </div>

      <FinalizeDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        dossierId={dossierId}
        funnel={funnel}
        data={data}
        testMode={testMode}
      />
    </div>
  )
}
