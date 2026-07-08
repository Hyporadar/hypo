'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Lightbulb, Percent, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardTip } from '@/components/wizard/use-dossier-wizard'

// Assistant discret en bas à droite : badge rond avec le wordmark (pas de
// robot). Badge rouge quand il y a un tip. Panneau latéral : jauge de
// progression, « encore ~X minutes », raccourci offres, conseils contextuels.
export function AssistantWidget({
  percent,
  minutesLeft,
  tips,
  onShowOffers,
}: {
  percent: number
  minutesLeft: number
  tips: WizardTip[]
  /** Raccourci « Vos taux » — masqué s'il n'y a pas de panneau d'offres. */
  onShowOffers?: () => void
}) {
  const t = useTranslations('wizard.assistant')
  const [open, setOpen] = useState(false)

  const R = 26
  const circumference = 2 * Math.PI * R

  return (
    <>
      {/* Badge flottant */}
      <button
        type="button"
        aria-label={t('open')}
        onClick={() => setOpen((o) => !o)}
        className="border-line fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full border bg-white shadow-md transition-transform hover:scale-105"
      >
        <span className="font-display text-lg font-bold">
          <span className="text-ink-900">H</span>
          <span className="text-pilot-600">P</span>
        </span>
        {tips.length > 0 ? (
          <span
            aria-hidden
            className="bg-erreur absolute top-0 right-0 flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          >
            {tips.length}
          </span>
        ) : null}
      </button>

      {/* Panneau latéral */}
      <div
        role="dialog"
        aria-label={t('title')}
        className={cn(
          'border-line fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm transform border-l bg-white shadow-xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t('title')}</h2>
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => setOpen(false)}
              className="text-ink-400 hover:text-ink-900"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Jauge circulaire */}
          <div className="mt-6 flex items-center gap-5">
            <svg viewBox="0 0 64 64" className="size-20 -rotate-90" aria-hidden>
              <circle cx="32" cy="32" r={R} fill="none" stroke="#E6E0D4" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r={R}
                fill="none"
                stroke="#1B6B52"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percent / 100)}
                className="transition-all duration-500"
              />
            </svg>
            <div>
              <p className="text-data text-3xl">{percent}%</p>
              <p className="text-ink-500 text-sm">{t('minutesLeft', { minutes: minutesLeft })}</p>
            </div>
          </div>

          {/* Raccourci offres (si un panneau d'offres existe) */}
          {onShowOffers ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onShowOffers()
              }}
              className="border-line hover:border-pilot-600 mt-6 flex items-center gap-3 rounded-xl border p-4 text-left transition-colors"
            >
              <span className="bg-pilot-50 text-pilot-700 flex size-9 items-center justify-center rounded-full">
                <Percent className="size-4.5" strokeWidth={1.8} />
              </span>
              <span className="text-sm font-medium">{t('yourRates')}</span>
            </button>
          ) : null}

          {/* Conseils contextuels — jamais bloquants */}
          <div className="mt-6 flex-1 overflow-auto">
            <h3 className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('tipsTitle')}
            </h3>
            {tips.length === 0 ? (
              <p className="text-ink-500 mt-3 text-sm">{t('noTips')}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {tips.map((tip) => (
                  <li
                    key={tip.id}
                    className="border-ambre-500 bg-ambre-50 flex gap-2.5 rounded-xl border p-3.5 text-sm leading-relaxed"
                  >
                    <Lightbulb className="text-ambre-600 mt-0.5 size-4 shrink-0" />
                    {t(`tips.${tip.id}`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
