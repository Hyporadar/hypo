'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface AutocompleteItem {
  id: string
  label: string
  sublabel?: string
  payload?: unknown
}

// Autocomplete générique branché sur une API (?q=) — NPA/localités et
// prêteurs. Clavier : flèches + Entrée, Échap ferme.
export function AutocompleteField({
  id,
  value,
  placeholder,
  endpoint,
  onSelect,
  onTextChange,
}: {
  id: string
  value: string
  placeholder?: string
  endpoint: '/api/localities' | '/api/lenders'
  onSelect: (item: AutocompleteItem) => void
  onTextChange?: (text: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [items, setItems] = useState<AutocompleteItem[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Resynchronise le texte quand la valeur contrôlée change (ajustement au rendu).
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setQuery(value)
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function search(text: string) {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      if (text.trim().length < 2) {
        setItems([])
        return
      }
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(text)}`)
        if (!res.ok) return
        const json = (await res.json()) as { results: Array<Record<string, unknown>> }
        const mapped: AutocompleteItem[] =
          endpoint === '/api/localities'
            ? json.results.map((r) => ({
                id: `${r.npa}-${r.localite}`,
                label: String(r.label),
                payload: r,
              }))
            : json.results.map((r) => ({
                id: String(r.id),
                label: String(r.nom),
                sublabel: String(r.nomCourt),
                payload: r,
              }))
        setItems(mapped)
        setOpen(mapped.length > 0)
        setActive(0)
      } catch {
        // hors ligne : pas de suggestions
      }
    }, 250)
  }

  function choose(item: AutocompleteItem) {
    setQuery(item.label)
    setOpen(false)
    onSelect(item)
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        className="h-12"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onTextChange?.(e.target.value)
          search(e.target.value)
        }}
        onKeyDown={(e) => {
          if (!open) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, items.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const item = items[active]
            if (item) choose(item)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="border-line absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white py-1 shadow-md"
        >
          {items.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm',
                  i === active ? 'bg-pilot-50' : 'hover:bg-surface-alt'
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(item)}
              >
                <span>{item.label}</span>
                {item.sublabel ? (
                  <span className="text-ink-400 shrink-0 text-xs">{item.sublabel}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
