'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Groupe répétable (hypothèques existantes, revenus, avoirs, charges,
// poursuites, autres biens) : sous-formulaire → « Terminé » / « + Ajouter »,
// éléments saisis en lignes résumées ✏️ 🗑, total calculé si pertinent.
export function RepeatableGroup<T>({
  items,
  onChange,
  renderForm,
  renderSummary,
  makeEmpty,
  total,
  labels,
  minItems = 0,
  maxItems = 10,
}: {
  items: T[]
  onChange: (items: T[]) => void
  /** Formulaire d'édition d'un élément — update applique un patch partiel
      de façon fonctionnelle (pas d'écrasement par snapshot périmé). */
  renderForm: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode
  /** Ligne résumée d'un élément saisi. */
  renderSummary: (item: T) => React.ReactNode
  makeEmpty: () => T
  /** Total affiché sous les lignes (déjà formaté), ou null. */
  total?: string | null
  labels: {
    done: string
    add: string
    edit: string
    remove: string
    totalLabel?: string
  }
  minItems?: number
  maxItems?: number
}) {
  // Index en cours d'édition ; null = tout est replié.
  const [editing, setEditing] = useState<number | null>(items.length === 0 ? -1 : null)
  const [draft, setDraft] = useState<T>(makeEmpty)

  function startAdd() {
    setDraft(makeEmpty())
    setEditing(-1)
  }

  function startEdit(index: number) {
    setDraft(structuredClone(items[index]!))
    setEditing(index)
  }

  function commit(addAnother: boolean) {
    const next = [...items]
    if (editing === -1) next.push(draft)
    else if (editing !== null) next[editing] = draft
    onChange(next)
    if (addAnother) {
      setDraft(makeEmpty())
      setEditing(-1)
    } else {
      setEditing(null)
    }
  }

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index)
    onChange(next)
    if (next.length < minItems) setEditing(-1)
  }

  return (
    <div className="space-y-3">
      {/* Lignes résumées */}
      {items.length > 0 ? (
        <ul className="divide-line border-line divide-y rounded-xl border bg-white">
          {items.map((item, index) => (
            <li
              key={index}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm',
                editing === index && 'bg-pilot-50'
              )}
            >
              <div className="min-w-0 flex-1">{renderSummary(item)}</div>
              <button
                type="button"
                aria-label={labels.edit}
                onClick={() => startEdit(index)}
                className="text-ink-400 hover:text-pilot-600 shrink-0"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={labels.remove}
                onClick={() => remove(index)}
                className="text-ink-400 hover:text-erreur shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {total && items.length > 1 ? (
        <p className="text-ink-700 text-right text-sm">
          {labels.totalLabel ? `${labels.totalLabel} : ` : ''}
          <span className="text-data font-medium">{total}</span>
        </p>
      ) : null}

      {/* Sous-formulaire */}
      {editing !== null ? (
        <div className="border-pilot-200 bg-pilot-50/40 space-y-4 rounded-xl border p-4">
          {renderForm(draft, (patch) => setDraft((prev) => ({ ...prev, ...patch })))}
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" onClick={() => commit(false)}>
              {labels.done}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={items.length + 1 >= maxItems && editing === -1}
              onClick={() => commit(true)}
            >
              <Plus data-icon="inline-start" />
              {labels.add}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= maxItems}
          onClick={startAdd}
        >
          <Plus data-icon="inline-start" />
          {labels.add}
        </Button>
      )}
    </div>
  )
}
