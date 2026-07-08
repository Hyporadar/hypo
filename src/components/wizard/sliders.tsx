'use client'

import { useId, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { formatThousands, parseMoney } from '@/components/wizard/inputs'
import { cn } from '@/lib/utils'

/* Pas d'arrondi de la poignée du SplitSlider. */
const STEP = 5000

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** Curseur à crans : la valeur rendue est celle du cran, pas son index.
    Tant qu'aucun choix n'est fait (value null), la poignée reste au centre, grisée. */
export function NotchedSlider({
  id,
  value,
  onChange,
  notches,
  ariaLabel,
}: {
  id: string
  value: number | null
  onChange: (v: number) => void
  notches: Array<{ value: number; label?: string }>
  ariaLabel: string
}) {
  const count = notches.length
  const selectedIndex = value === null ? -1 : notches.findIndex((n) => n.value === value)
  const index = selectedIndex >= 0 ? selectedIndex : Math.round((count - 1) / 2)
  const pct = (i: number) => (count > 1 ? (i / (count - 1)) * 100 : 50)
  return (
    <div>
      <input
        id={id}
        type="range"
        min={0}
        max={count - 1}
        step={1}
        value={index}
        aria-label={ariaLabel}
        onChange={(e) => {
          const notch = notches[Number(e.target.value)]
          if (notch) onChange(notch.value)
        }}
        className={cn(
          'block h-6 w-full cursor-pointer',
          value === null ? 'accent-ink-400 opacity-60' : 'accent-pilot-600'
        )}
      />
      {/* Crans matérialisés sous la piste. */}
      <div className="relative mt-1 h-1.5">
        {notches.map((notch, i) => (
          <span
            key={`${notch.value}-${i}`}
            className="bg-line-strong absolute top-0 size-1.5 -translate-x-1/2 rounded-full"
            style={{ left: `${pct(i)}%` }}
          />
        ))}
      </div>
      {/* Étiquettes sous les crans qui en ont une. */}
      <div className="relative mt-1.5 h-4">
        {notches.map((notch, i) =>
          notch.label ? (
            <span
              key={`${notch.value}-${i}`}
              className="text-ink-500 absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap"
              style={{ left: `${pct(i)}%` }}
            >
              {notch.label}
            </span>
          ) : null
        )}
      </div>
    </div>
  )
}

/** Champ montant compact avec préfixe CHF (mêmes conventions que AmountInput). */
function CompactAmount({
  id,
  value,
  onChange,
}: {
  id: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex">
      <span className="text-ink-500 text-data bg-surface-alt border-line flex items-center rounded-l-lg border border-r-0 px-2 text-xs">
        CHF
      </span>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="text-data h-10 rounded-l-none rounded-r-lg bg-white text-sm"
        value={formatThousands(String(value))}
        onChange={(e) => onChange(parseMoney(e.target.value) ?? 0)}
      />
    </div>
  )
}

/** Hypothèque et fonds propres se partagent visuellement la largeur de la barre.
    Poignée draggable (arrondie au 5'000) + deux champs éditables au clavier. */
export function SplitSlider({
  total,
  mortgage,
  onChange,
  mortgageLabel,
  ownFundsLabel,
  totalLabel,
}: {
  total: number
  mortgage: number
  onChange: (mortgage: number) => void
  mortgageLabel: string
  ownFundsLabel: string
  totalLabel: string
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const baseId = useId()
  const ownFunds = clamp(total - mortgage, 0, total)
  const ratio = total > 0 ? clamp(mortgage / total, 0, 1) : 0

  function moveTo(clientX: number) {
    const bar = barRef.current
    if (!bar || total <= 0) return
    const rect = bar.getBoundingClientRect()
    const r = clamp((clientX - rect.left) / rect.width, 0, 1)
    onChange(clamp(Math.round((r * total) / STEP) * STEP, 0, total))
  }

  return (
    <div>
      <div
        ref={barRef}
        className="relative h-12 w-full cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          moveTo(e.clientX)
        }}
        onPointerMove={(e) => {
          if (dragging) moveTo(e.clientX)
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
          setDragging(false)
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="border-line absolute inset-0 flex overflow-hidden rounded-full border">
          <div className="bg-pilot-600 h-full" style={{ width: `${ratio * 100}%` }} />
          <div className="bg-ambre-100 h-full flex-1" />
        </div>
        {/* Poignée : drag au pointeur, flèches au clavier. */}
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={clamp(mortgage, 0, total)}
          aria-label={mortgageLabel}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault()
              onChange(clamp(mortgage - STEP, 0, total))
            }
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault()
              onChange(clamp(mortgage + STEP, 0, total))
            }
          }}
          className="border-pilot-600 focus-visible:ring-pilot-200 absolute top-1/2 h-14 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white shadow-sm focus-visible:ring-2 focus-visible:outline-none"
          style={{ left: `${ratio * 100}%` }}
        />
      </div>
      {/* Champs éditables : modifier l'un recalcule l'autre. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${baseId}-hypotheque`}
            className="text-ink-700 mb-1 block text-xs font-medium"
          >
            {mortgageLabel}
          </label>
          <CompactAmount
            id={`${baseId}-hypotheque`}
            value={clamp(mortgage, 0, total)}
            onChange={(v) => onChange(clamp(v, 0, total))}
          />
        </div>
        <div>
          <label
            htmlFor={`${baseId}-fonds-propres`}
            className="text-ink-700 mb-1 block text-xs font-medium"
          >
            {ownFundsLabel}
          </label>
          <CompactAmount
            id={`${baseId}-fonds-propres`}
            value={ownFunds}
            onChange={(v) => onChange(clamp(total - v, 0, total))}
          />
        </div>
      </div>
      <p className="text-ink-700 mt-3 text-center text-sm">
        {totalLabel}{' '}
        <span className="text-data">CHF {formatThousands(String(Math.max(total, 0)))}</span>
      </p>
    </div>
  )
}
