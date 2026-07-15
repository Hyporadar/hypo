'use client'

import { useTranslations } from 'next-intl'
import { Info } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Sélecteur inline achat / renouvellement, affiché EN HAUT du formulaire
// (même page), pas sur un écran séparé. Partagé par /dossier et /dossier/2.
const OPTIONS: Array<{ funnel: Funnel; key: 'achat' | 'renouvellement' }> = [
  { funnel: 'ACHAT', key: 'achat' },
  { funnel: 'RENOUVELLEMENT_CHAUD', key: 'renouvellement' },
]

export function FunnelToggle({
  value,
  onChange,
  className,
  info,
}: {
  value: Funnel | null
  onChange: (funnel: Funnel) => void
  className?: string
  /** Texte du petit « i » d'explication (optionnel). */
  info?: string
}) {
  const t = useTranslations('funnelChoice')

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium">{t('title')}</p>
        {info ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={info}
                className="text-ink-400 hover:text-pilot-600 transition-colors"
              >
                <Info className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-w-72 text-sm leading-relaxed">
              {info}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ funnel, key }) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === funnel}
            onClick={() => onChange(funnel)}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
              value === funnel
                ? 'border-pilot-600 bg-pilot-600 text-white'
                : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
            )}
          >
            {t(`${key}.short`)}
          </button>
        ))}
      </div>
    </div>
  )
}
