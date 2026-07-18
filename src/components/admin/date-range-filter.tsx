'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Filtre de période (du… au…) synchronisé sur l'URL (?from&to). Filtre les
// KPIs, graphiques, entonnoir et tableaux de la page admin.
export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''

  function set(key: 'from' | 'to', value: string) {
    const p = new URLSearchParams(sp.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    router.push(`${pathname}?${p.toString()}`)
  }

  function clear() {
    const p = new URLSearchParams(sp.toString())
    p.delete('from')
    p.delete('to')
    p.delete('page')
    router.push(`${pathname}?${p.toString()}`)
  }

  const field =
    'border-line text-data h-9 rounded-md border bg-white px-2 text-sm focus-visible:outline-none'

  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="date"
        aria-label="Du"
        value={from}
        max={to || undefined}
        onChange={(e) => set('from', e.target.value)}
        className={field}
      />
      <span className="text-ink-400">→</span>
      <input
        type="date"
        aria-label="Au"
        value={to}
        min={from || undefined}
        onChange={(e) => set('to', e.target.value)}
        className={field}
      />
      {from || to ? (
        <button
          type="button"
          onClick={clear}
          className="text-ink-500 hover:text-ink-900 text-xs underline underline-offset-2"
        >
          Effacer
        </button>
      ) : null}
    </div>
  )
}
