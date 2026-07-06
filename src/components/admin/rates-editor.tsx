'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { deleteReferenceRate, upsertReferenceRate } from '@/server/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface RateRow {
  type: 'FIXE' | 'SARON'
  termYears: number
  rate: number
}

// CRUD des taux de référence — alimente tous les calculs publics.
// Chaque modification est historisée (ReferenceRateChange) côté serveur.
export function RatesEditor({ rates }: { rates: RateRow[] }) {
  const [pending, startTransition] = useTransition()
  const [newTerm, setNewTerm] = useState('')
  const [newRate, setNewRate] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  function key(r: { type: string; termYears: number }) {
    return `${r.type}-${r.termYears}`
  }

  function save(row: RateRow) {
    const raw = drafts[key(row)]
    const value = raw !== undefined ? Number(raw.replace(',', '.')) : row.rate
    if (!Number.isFinite(value) || value < 0 || value > 15) return
    startTransition(async () => {
      await upsertReferenceRate({ type: row.type, termYears: row.termYears, rate: value })
      setDrafts((d) => ({ ...d, [key(row)]: '' }))
    })
  }

  return (
    <div className="border-line max-w-2xl rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-line text-ink-500 border-b text-left text-xs">
            <th className="px-4 py-2.5 font-medium">Produit</th>
            <th className="px-4 py-2.5 font-medium">Taux (%)</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rates.map((row) => (
            <tr key={key(row)} className="border-line border-b last:border-0">
              <td className="px-4 py-2">
                {row.type === 'SARON' ? 'SARON' : `Fixe ${row.termYears} ans`}
              </td>
              <td className="px-4 py-2">
                <Input
                  className="text-data h-8 w-24"
                  value={drafts[key(row)] || String(row.rate).replace('.', ',')}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key(row)]: e.target.value }))}
                  onBlur={() => save(row)}
                  onKeyDown={(e) => e.key === 'Enter' && save(row)}
                />
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Supprimer"
                  disabled={pending}
                  onClick={() =>
                    startTransition(
                      async () => void (await deleteReferenceRate(row.type, row.termYears))
                    )
                  }
                >
                  <Trash2 className="text-ink-400 size-3.5" />
                </Button>
              </td>
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3">
              <Input
                className="text-data h-8 w-28"
                placeholder="Durée (ans)"
                inputMode="numeric"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value.replace(/[^\d]/g, ''))}
              />
            </td>
            <td className="px-4 py-3">
              <Input
                className="text-data h-8 w-24"
                placeholder="1,45"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </td>
            <td className="px-4 py-3 text-right">
              <Button
                size="xs"
                disabled={pending || !newTerm || !newRate}
                onClick={() => {
                  const rate = Number(newRate.replace(',', '.'))
                  const termYears = Number(newTerm)
                  if (!Number.isFinite(rate) || !Number.isFinite(termYears)) return
                  startTransition(async () => {
                    await upsertReferenceRate({ type: 'FIXE', termYears, rate })
                    setNewTerm('')
                    setNewRate('')
                  })
                }}
              >
                <Plus data-icon="inline-start" />
                Ajouter
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
