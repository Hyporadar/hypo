'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Info } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'
import { EstimationSection } from '@/components/wizard/estimation-section'
import { FunnelToggle } from '@/components/wizard/funnel-choice'
import { AmountInput } from '@/components/wizard/inputs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Libellé + petit « i » d'explication (popover).
function FieldLabel({ htmlFor, label, info }: { htmlFor: string; label: string; info: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={info}
            className="text-ink-400 hover:text-pilot-600 transition-colors"
          >
            <Info className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-w-72 text-sm leading-relaxed">
          {info}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Chemin court (/dossier/2) : 3 chiffres → estimation directe. Réutilise le
// moteur de taux et l'écran d'estimation (email + rappel) du wizard complet.
export function DossierShort() {
  const t = useTranslations('dossierShort')
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [valeur, setValeur] = useState<number | null>(null)
  const [montant, setMontant] = useState<number | null>(null)
  const [revenu, setRevenu] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [dossierId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `short-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  )

  const valid = funnel != null && (valeur ?? 0) > 0 && (montant ?? 0) > 0 && (revenu ?? 0) > 0

  const data = useMemo(
    () =>
      ({
        bien: { usage: 'RESIDENCE_PRINCIPALE', valeur: valeur ?? null, prixAchat: null },
        tranchesExistantes: [],
        autresPrets: [],
        ajustement: {},
        montantTotal: montant ?? null,
        tranchesSouhaitees: [],
        dateDebut: null,
        emprunteurs: [
          {
            ordre: 1,
            aRevenu: true,
            revenus: [{ categorie: 'ACTIVITE', typeActivite: 'SALARIE', montantAnnuel: revenu ?? 0 }],
            charges: [],
            avoirs: [],
            poursuites: [],
          },
        ],
        autresBiens: [],
        asks: {},
      }) as DossierData,
    [valeur, montant, revenu]
  )

  if (submitted && funnel) {
    return <EstimationSection funnel={funnel} data={data} dossierId={dossierId} testMode />
  }

  return (
    <div className="border-line mx-auto max-w-md rounded-xl border bg-white p-6 sm:p-8">
      <h1 className="font-display text-xl font-semibold sm:text-2xl">{t('title')}</h1>
      <p className="text-ink-500 mt-1 text-sm leading-relaxed">{t('subtitle')}</p>
      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setSubmitted(true)
        }}
      >
        <FunnelToggle value={funnel} onChange={setFunnel} info={t('funnelInfo')} />
        <div className="space-y-1.5">
          <FieldLabel htmlFor="q-valeur" label={t('valeur')} info={t('infoValeur')} />
          <AmountInput id="q-valeur" value={valeur} onChange={setValeur} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="q-montant" label={t('montant')} info={t('infoMontant')} />
          <AmountInput id="q-montant" value={montant} onChange={setMontant} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="q-revenu" label={t('revenu')} info={t('infoRevenu')} />
          <AmountInput id="q-revenu" value={revenu} onChange={setRevenu} placeholder="p.ex. 150'000" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!valid}>
          {t('cta')}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>
    </div>
  )
}
