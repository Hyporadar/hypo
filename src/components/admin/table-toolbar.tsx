'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FilterDef {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
}

const ALL = '__all__'

// Barre de recherche + filtres synchronisés sur l'URL (le tableau est serveur).
export function TableToolbar({
  searchPlaceholder = 'Rechercher…',
  filters = [],
}: {
  searchPlaceholder?: string
  filters?: FilterDef[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function push(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '' || v === ALL) params.delete(k)
      else params.set(k, v)
    }
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="text-ink-400 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={q}
          placeholder={searchPlaceholder}
          className="pl-9"
          onChange={(e) => {
            setQ(e.target.value)
            if (debounce.current) clearTimeout(debounce.current)
            debounce.current = setTimeout(() => push({ q: e.target.value }), 350)
          }}
        />
      </div>
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) ?? ALL}
          onValueChange={(v) => push({ [filter.key]: v })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-32" aria-label={filter.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filter.label} : tous</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
