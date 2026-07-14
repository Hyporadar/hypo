'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'done' | 'current' | 'todo'

export interface WizardStep {
  key: string
  label: string
  status: StepStatus
}

// Stepper horizontal « ligne + points » : une ligne relie des pastilles,
// libellés dessous. Point courant foncé, étapes faites vertes, à venir grises.
export function WizardStepper({
  steps,
  onSelect,
}: {
  steps: WizardStep[]
  onSelect: (key: string) => void
}) {
  return (
    <ol className="flex items-start">
      {steps.map((step, i) => {
        const reached = step.status !== 'todo'
        const nextReached = i < steps.length - 1 && steps[i + 1]!.status !== 'todo'
        return (
          <li key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn('h-0.5 flex-1', i === 0 ? 'invisible' : reached ? 'bg-pilot-600' : 'bg-line')}
              />
              <button
                type="button"
                aria-current={step.status === 'current' ? 'step' : undefined}
                aria-label={step.label}
                onClick={() => onSelect(step.key)}
                className="flex items-center justify-center"
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full transition-colors',
                    step.status === 'current'
                      ? 'bg-pilot-900 ring-pilot-100 size-4 ring-4'
                      : step.status === 'done'
                        ? 'bg-pilot-600 size-5'
                        : 'bg-line-strong size-3.5'
                  )}
                >
                  {step.status === 'done' ? (
                    <Check className="size-3 text-white" strokeWidth={3} />
                  ) : null}
                </span>
              </button>
              <span
                className={cn(
                  'h-0.5 flex-1',
                  i === steps.length - 1 ? 'invisible' : nextReached ? 'bg-pilot-600' : 'bg-line'
                )}
              />
            </div>
            <button
              type="button"
              onClick={() => onSelect(step.key)}
              className={cn(
                'mt-2 px-1 text-center text-xs sm:text-sm',
                step.status === 'current'
                  ? 'text-ink-900 font-semibold'
                  : step.status === 'done'
                    ? 'text-pilot-700'
                    : 'text-ink-400'
              )}
            >
              {step.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
