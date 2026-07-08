'use client'

import { PropertyIcon, type PropertyIconType } from '@/components/wizard/property-icons'
import { cn } from '@/lib/utils'

/* Classes partagées des boutons d'option (façon radio). */
function optionButtonClasses(selected: boolean): string {
  return cn(
    'min-h-12 w-full rounded-xl border px-4 py-3 text-left transition-colors',
    'focus-visible:ring-pilot-200 focus-visible:ring-2 focus-visible:outline-none',
    selected
      ? 'border-pilot-600 bg-pilot-600 text-white'
      : 'border-line hover:bg-surface-alt bg-white'
  )
}

/** Liste verticale d'options exclusives — un seul choix, sélection au clic. */
export function OptionList<T extends string>({
  options,
  value,
  onSelect,
  className,
}: {
  options: Array<{ value: T; label: string; sublabel?: string }>
  value: T | null
  onSelect: (value: T) => void
  className?: string
}) {
  return (
    <div role="radiogroup" className={cn('flex flex-col gap-3', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={optionButtonClasses(selected)}
          >
            <span className="block text-base font-medium">{option.label}</span>
            {option.sublabel ? (
              <span
                className={cn('mt-0.5 block text-sm', selected ? 'text-pilot-100' : 'text-ink-500')}
              >
                {option.sublabel}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Variante illustrée : pictogramme affiché à droite du label. */
export function OptionListIllustrated<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: Array<{ value: T; label: string; sublabel?: string; icon: PropertyIconType }>
  value: T | null
  onSelect: (value: T) => void
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={cn(optionButtonClasses(selected), 'flex items-center justify-between gap-4')}
          >
            <span className="min-w-0">
              <span className="block text-base font-medium">{option.label}</span>
              {option.sublabel ? (
                <span
                  className={cn(
                    'mt-0.5 block text-sm',
                    selected ? 'text-pilot-100' : 'text-ink-500'
                  )}
                >
                  {option.sublabel}
                </span>
              ) : null}
            </span>
            {/* Fond blanc derrière le picto pour rester lisible sur fond vert. */}
            <span className={cn('shrink-0', selected && 'rounded-lg bg-white/90 p-1')}>
              <PropertyIcon type={option.icon} className="size-10" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
