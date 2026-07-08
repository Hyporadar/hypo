'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, GitCompare, History, PencilLine, Undo2 } from 'lucide-react'
import { restoreDossierVersionAction } from '@/server/actions/admin-dossier'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface VersionSummary {
  numero: number
  authorType: string
  authorName: string
  commentaire: string | null
  createdAt: string // déjà formaté côté serveur (fuseau stable)
}

const AUTHOR_LABELS: Record<string, string> = {
  LEAD: 'Client',
  CLOSER: 'Closer',
  ADMIN: 'Admin',
  SYSTEM: 'Système',
}

// Barre de versionnage : sélecteur d'historique, comparaison, restauration
// (= nouvelle version copie), édition, export JSON. Rien n'est jamais purgé.
export function VersionsBar({
  dossierId,
  versions,
  selected,
  canEdit,
  canExport,
}: {
  dossierId: string
  versions: VersionSummary[]
  selected: number
  canEdit: boolean
  canExport: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [compareWith, setCompareWith] = useState<string>('')
  const current = versions[0]?.numero ?? 1
  const isCurrent = selected === current

  function go(params: Record<string, string | null>) {
    const search = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(params)) {
      if (value === null) search.delete(key)
      else search.set(key, value)
    }
    router.push(`/admin/dossiers/${dossierId}?${search.toString()}`)
  }

  function restore() {
    if (!window.confirm(`Restaurer la v${selected} comme NOUVELLE version ?`)) return
    startTransition(async () => {
      const result = await restoreDossierVersionAction({ dossierId, numero: selected })
      // Navigation dure : garantit un état serveur frais (nouvelle version).
      if (result.ok) window.location.assign(`/admin/dossiers/${dossierId}`)
    })
  }

  return (
    <div className="border-line flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
      <History className="text-ink-400 size-4 shrink-0" />
      <Select value={String(selected)} onValueChange={(v) => go({ v, compare: null, edit: null })}>
        <SelectTrigger className="h-9 w-full sm:w-96" aria-label="Version affichée">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {versions.map((version) => (
            <SelectItem key={version.numero} value={String(version.numero)}>
              v{version.numero}
              {version.numero === current ? ' (actuelle)' : ''} —{' '}
              {AUTHOR_LABELS[version.authorType] ?? version.authorType} {version.authorName} ·{' '}
              {version.createdAt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isCurrent ? (
        <>
          <Badge className="bg-ambre-100 text-ambre-700">Lecture seule — ancienne version</Badge>
          {canEdit ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={restore}>
              <Undo2 data-icon="inline-start" />
              Restaurer comme nouvelle version
            </Button>
          ) : null}
        </>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {versions.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <GitCompare className="text-ink-400 size-4" />
            <Select
              value={compareWith}
              onValueChange={(v) => {
                setCompareWith(v)
                go({ compare: `${v}-${selected}`, edit: null })
              }}
            >
              <SelectTrigger className="h-9 w-44" aria-label="Comparer avec">
                <SelectValue placeholder="Comparer avec…" />
              </SelectTrigger>
              <SelectContent>
                {versions
                  .filter((version) => version.numero !== selected)
                  .map((version) => (
                    <SelectItem key={version.numero} value={String(version.numero)}>
                      v{version.numero} — {version.authorName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {canEdit && isCurrent ? (
          <Button type="button" size="sm" onClick={() => go({ edit: '1', compare: null })}>
            <PencilLine data-icon="inline-start" />
            Modifier
          </Button>
        ) : null}
        {canExport ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={`/api/admin/dossiers/${dossierId}/export`} download>
              <Download data-icon="inline-start" />
              Export JSON
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
