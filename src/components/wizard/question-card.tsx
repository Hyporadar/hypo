'use client'

import { useEffect, useRef, useState } from 'react'
import { Info, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type QuestionStatus = 'untouched' | 'required' | 'complete'

// Une carte blanche par question. Barre de statut fine à gauche :
// neutre (non touchée) / ambre (« Information requise ») / verte (complète).
// Apparition en fondu (progressive disclosure) quand la précédente est répondue.
export function QuestionCard({
  id,
  title,
  subtitle,
  status,
  info,
  sensitive,
  sensitiveLabel,
  highlight = false,
  children,
}: {
  id: string
  title: string
  subtitle?: string
  status: QuestionStatus
  /** Explication en langage simple (popover ⓘ) : pourquoi on demande ça. */
  info?: string
  /** Champ sensible : bouclier + tooltip « jamais transmis sans votre accord ». */
  sensitive?: boolean
  sensitiveLabel?: string
  /** Surbrillance 2s après navigation depuis « informations manquantes ». */
  highlight?: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [flash, setFlash] = useState(false)

  // Déclenche la surbrillance au front montant de `highlight` (ajustement au rendu).
  const [prevHighlight, setPrevHighlight] = useState(highlight)
  if (highlight !== prevHighlight) {
    setPrevHighlight(highlight)
    if (highlight) setFlash(true)
  }

  useEffect(() => {
    if (!flash) return
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => setFlash(false), 2_000)
    return () => clearTimeout(timer)
  }, [flash])

  return (
    <div
      ref={ref}
      id={`question-${id}`}
      data-status={status}
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 relative scroll-mt-28 rounded-xl border bg-white shadow-sm duration-300',
        flash ? 'border-pilot-600 ring-pilot-200 ring-3' : 'border-line'
      )}
    >
      {/* Barre de statut sur le bord gauche */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors',
          status === 'complete' && 'bg-pilot-600',
          status === 'required' && 'bg-ambre-500',
          status === 'untouched' && 'bg-line'
        )}
      />
      <div className="p-5 pl-6 sm:p-6 sm:pl-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-base font-semibold sm:text-lg">
              {title}
              {sensitive ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} aria-label={sensitiveLabel}>
                      <ShieldCheck className="text-pilot-600 size-4" strokeWidth={2} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">{sensitiveLabel}</TooltipContent>
                </Tooltip>
              ) : null}
            </h3>
            {subtitle ? <p className="text-ink-500 mt-0.5 text-sm">{subtitle}</p> : null}
          </div>
          {info ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={title}
                  className="text-ink-400 hover:text-pilot-600 shrink-0 transition-colors"
                >
                  <Info className="size-4.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-w-72 text-sm leading-relaxed">
                {info}
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
