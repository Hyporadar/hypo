'use client'

import { Button } from '@/components/ui/button'

// Bouton du hero : ouvre la pop-up du calculateur (écoutée par HomeLeadWidget).
export function OpenCalcButton({ label }: { label: string }) {
  return (
    <Button size="lg" onClick={() => window.dispatchEvent(new CustomEvent('hp-open-calc'))}>
      {label}
    </Button>
  )
}
