'use client'

import { useState } from 'react'
import { formatCHF } from '@/lib/format'

// Mini graphique à barres (par jour), sans dépendance : barres en flex,
// hauteur relative au max, infobulle personnalisée au survol (jour + nombre
// de demandes + montant pour le graphique des hypothèques).

export interface DayPoint {
  key: string // AAAA-MM-JJ
  label: string // libellé court pour l'axe (ex. 17.07)
  count: number // nombre de demandes ce jour
  value: number // valeur des hypothèques demandées ce jour (CHF)
}

export function MiniBarChart({
  points,
  metric,
  showAmount = false,
  color = 'var(--color-pilot-500)',
}: {
  points: DayPoint[]
  /** Grandeur qui pilote la hauteur des barres. */
  metric: 'count' | 'value'
  /** Ajoute le montant des hypothèques à l'infobulle (graphique valeur). */
  showAmount?: boolean
  color?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p[metric]))
  const n = points.length

  const lines = (p: DayPoint) => {
    const day = `${p.key.slice(8, 10)}.${p.key.slice(5, 7)}.${p.key.slice(0, 4)}`
    const out = [day, `${p.count} demande${p.count > 1 ? 's' : ''}`]
    if (showAmount) out.push(`${formatCHF(p.value)} demandés`)
    return out
  }

  const active = hover != null ? points[hover] : null
  const pos = hover != null ? (hover + 0.5) / n : 0
  // Ancrage horizontal de l'infobulle pour ne pas déborder des bords.
  const tx = pos < 0.15 ? '0%' : pos > 0.85 ? '-100%' : '-50%'

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      {active ? (
        <div
          className="bg-ink-900 pointer-events-none absolute z-10 rounded-md px-2 py-1 text-[11px] leading-tight whitespace-nowrap text-white shadow-md"
          style={{ left: `${pos * 100}%`, top: 0, transform: `translate(${tx}, calc(-100% - 4px))` }}
        >
          {lines(active).map((l, i) => (
            <div key={i} className={i === 0 ? 'font-medium' : 'text-white/80'}>
              {l}
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-line flex h-24 items-end gap-px border-b">
        {points.map((p, i) => {
          const v = p[metric]
          return (
            <div
              key={p.key}
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setHover(i)}
            >
              <div
                className="w-full rounded-t-sm transition-opacity"
                style={{
                  height: v > 0 ? `${Math.max(3, (v / max) * 100)}%` : '0',
                  backgroundColor: color,
                  opacity: hover == null || hover === i ? 1 : 0.4,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="text-ink-400 mt-1 flex justify-between text-[10px]">
        <span>{points[0]?.label}</span>
        <span>{points[n - 1]?.label}</span>
      </div>
    </div>
  )
}
