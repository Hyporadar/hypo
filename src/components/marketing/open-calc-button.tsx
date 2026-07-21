'use client'

import { Button } from '@/components/ui/button'

// Bouton qui ouvre la pop-up du calculateur (écoutée par HomeLeadWidget).
// `funnel` pré-sélectionne Achat / Renouvellement dans la pop-up.
export function OpenCalcButton({
  label,
  funnel,
  variant,
  className,
}: {
  label: string
  funnel?: 'achat' | 'renouvellement'
  variant?: 'default' | 'outline'
  className?: string
}) {
  return (
    <Button
      size="lg"
      variant={variant}
      className={className}
      onClick={() =>
        window.dispatchEvent(new CustomEvent('hp-open-calc', { detail: { funnel } }))
      }
    >
      {label}
    </Button>
  )
}
