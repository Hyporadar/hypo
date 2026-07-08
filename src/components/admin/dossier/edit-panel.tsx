'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { Save, X } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'
import { saveDossierAction } from '@/server/actions/dossier'
import { BienSection } from '@/components/wizard/bien-section'
import { EmprunteursSection } from '@/components/wizard/emprunteurs-section'
import { HypothequeSection } from '@/components/wizard/hypotheque-section'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { key: 'bien', label: '1. Le bien' },
  { key: 'emprunteurs', label: '2. Les emprunteurs' },
  { key: 'hypotheque', label: "3. L'hypothèque" },
] as const

// Mode ÉDITION VERSIONNÉE : réutilise les sections du wizard (mêmes
// composants, mêmes libellés) sur un état local — « Enregistrer comme
// nouvelle version » avec commentaire OBLIGATOIRE pour un closer.
export function EditPanel({
  dossierId,
  funnel,
  initialData,
  role,
  messages,
}: {
  dossierId: string
  funnel: Funnel
  initialData: DossierData
  role: string
  messages: Record<string, unknown>
}) {
  const router = useRouter()
  const [data, setData] = useState<DossierData>(initialData)
  const [section, setSection] = useState<(typeof SECTIONS)[number]['key']>('bien')
  const [commentaire, setCommentaire] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const patch = (updater: (prev: DossierData) => DossierData) => setData(updater)
  const setBien = <K extends keyof DossierData['bien']>(
    key: K,
    value: DossierData['bien'][K]
  ) => setData((prev) => ({ ...prev, bien: { ...prev.bien, [key]: value } }))

  const commentaireRequis = role === 'CLOSER'
  const canSave = !pending && (!commentaireRequis || commentaire.trim().length > 0)

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await saveDossierAction({
        dossierId,
        funnel,
        data,
        commentaire: commentaire.trim() || undefined,
      })
      if (!result.ok) {
        setError(
          result.error === 'commentaire'
            ? 'Le commentaire est obligatoire pour un closer.'
            : result.error === 'tranches'
              ? 'La somme des tranches ne correspond pas au montant total.'
              : 'La sauvegarde a échoué.'
        )
        return
      }
      // Navigation dure : garantit un état serveur frais (nouvelle version).
      window.location.assign(`/admin/dossiers/${dossierId}`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="border-ambre-500 bg-ambre-50 text-ambre-700 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium">
        Mode édition — vos changements seront enregistrés comme une NOUVELLE version, rien
        n&apos;est écrasé.
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            router.push(`/admin/dossiers/${dossierId}`)
          }}
        >
          <X data-icon="inline-start" />
          Annuler
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              section === s.key
                ? 'border-pilot-600 bg-pilot-600 text-white'
                : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Les composants du wizard sont localisés — le panel est FR. */}
      <NextIntlClientProvider locale="fr" messages={messages} timeZone="Europe/Zurich">
        {section === 'bien' ? (
          <BienSection
            funnel={funnel}
            data={data}
            setBien={setBien}
            patch={patch}
            highlightKey={null}
            onAnswered={() => undefined}
            complex={false}
          />
        ) : section === 'emprunteurs' ? (
          <EmprunteursSection funnel={funnel} data={data} patch={patch} highlightKey={null} />
        ) : (
          <HypothequeSection
            funnel={funnel}
            data={data}
            dossierId={dossierId}
            patch={patch}
            highlightKey={null}
            showConversionCards={false}
          />
        )}
      </NextIntlClientProvider>

      <div className="border-line space-y-3 rounded-xl border bg-white p-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-commentaire">
            Commentaire {commentaireRequis ? '(obligatoire)' : '(recommandé)'}
          </Label>
          <Textarea
            id="edit-commentaire"
            rows={2}
            placeholder="Pourquoi cette modification ? p.ex. « Taux confirmé sur le relevé bancaire »"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />
        </div>
        {error ? <p className="text-erreur text-sm">{error}</p> : null}
        <Button type="button" disabled={!canSave} onClick={save}>
          <Save data-icon="inline-start" />
          Enregistrer comme nouvelle version
        </Button>
      </div>
    </div>
  )
}
