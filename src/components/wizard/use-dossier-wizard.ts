'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Funnel } from '@prisma/client'
import { classifyRenewal } from '@/lib/finance'
import { dossierDataSchema, type DossierData } from '@/lib/dossier/schema'
import { computeCompleteness, type Completeness } from '@/lib/dossier/completeness'
import { saveDossierAction, trackDossierEvent } from '@/server/actions/dossier'

// ─── Moteur d'état du Dossier Wizard ───────────────────────────────────
// État complet en localStorage (dossier anonyme, uuid) + reprise auto.
// Persistance locale instantanée + sauvegarde serveur versionnée (debounce
// 5s — chaque save = une version « Client »).

const STORAGE_KEY = 'hp-dossier'
const TEASER_KEY = 'hp-draft-renouvellement'
const SAVE_DEBOUNCE_MS = 5_000

interface StoredWizard {
  dossierId: string
  funnel: Funnel
  data: DossierData
  updatedAt: string
}

export const EMPTY_DATA: DossierData = {
  bien: {},
  tranchesExistantes: [],
  autresPrets: [],
  ajustement: {},
  montantTotal: null,
  tranchesSouhaitees: [],
  dateDebut: null,
  emprunteurs: [],
  autresBiens: [],
  asks: {},
}

/** Préremplissage depuis le teaser de la home (valeur, montant, revenu, NPA). */
function prefillFromTeaser(): { data: DossierData; funnel: Funnel } | null {
  try {
    const raw = window.localStorage.getItem(TEASER_KEY)
    if (!raw) return null
    const teaser = JSON.parse(raw) as {
      values?: {
        amount?: number | null
        propertyValue?: number | null
        income?: number | null
        plz?: string | null
        endMonth?: string | null
      }
    }
    const v = teaser.values
    if (!v) return null

    const data: DossierData = structuredClone(EMPTY_DATA)
    if (v.propertyValue) data.bien.valeur = v.propertyValue
    if (v.amount) data.montantTotal = v.amount
    if (v.plz) {
      const match = v.plz.match(/^(\d{4})\s*(.*)$/)
      if (match) {
        data.bien.npa = match[1]!
        if (match[2]) data.bien.localite = match[2]
      } else {
        data.bien.localite = v.plz
      }
    }
    if (v.income) {
      data.emprunteurs = [
        {
          ordre: 1,
          aRevenu: true,
          revenus: [
            { categorie: 'ACTIVITE', typeActivite: 'SALARIE', montantAnnuel: v.income },
          ],
          charges: [],
          avoirs: [],
          poursuites: [],
        },
      ]
    }

    // Routage funnel par l'échéance saisie (règles CLAUDE.md).
    let funnel: Funnel = 'RENOUVELLEMENT_CHAUD'
    if (v.endMonth && /^\d{4}-\d{2}$/.test(v.endMonth)) {
      const [y, m] = v.endMonth.split('-')
      const endDate = new Date(Date.UTC(Number(y), Number(m) - 1, 1))
      funnel =
        classifyRenewal(endDate, new Date()) === 'CHAUD'
          ? 'RENOUVELLEMENT_CHAUD'
          : 'RENOUVELLEMENT_FROID'
      if (v.amount) {
        data.tranchesExistantes = [
          {
            lenderId: null,
            lenderNom: null,
            montant: v.amount,
            taux: null,
            produit: 'FIXE',
            echeance: `${v.endMonth}-01`,
          },
        ]
      }
    }
    return { data, funnel }
  } catch {
    return null
  }
}

export interface WizardTip {
  id: 'lpp' | 'coldMonitoring' | 'ecoLabel'
}

export function useDossierWizard(initialFunnel?: Funnel, testMode = false) {
  const [hydrated, setHydrated] = useState(false)
  const [dossierId, setDossierId] = useState('')
  const [funnel, setFunnel] = useState<Funnel>(initialFunnel ?? 'RENOUVELLEMENT_CHAUD')
  const [data, setData] = useState<DossierData>(EMPTY_DATA)
  const [saving, setSaving] = useState(false)
  // Indicateur façon Google Docs : « Enregistrement… » très bref (le temps
  // d'un rendu) puis « Enregistré » — piloté par l'écriture localStorage
  // (instantanée), pas par la sauvegarde serveur versionnée (debounce 5s).
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef('')
  const firstPersist = useRef(true)

  // ── Restauration / préremplissage (une fois, côté client)
  /* eslint-disable react-hooks/set-state-in-effect -- restauration au montage */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as StoredWizard
        const parsed = dossierDataSchema.safeParse(stored.data)
        if (parsed.success) {
          setDossierId(stored.dossierId)
          setFunnel(stored.funnel)
          setData(parsed.data)
          setHydrated(true)
          return
        }
      }
      const teaser = prefillFromTeaser()
      setDossierId(crypto.randomUUID())
      if (teaser) {
        setFunnel(initialFunnel ?? teaser.funnel)
        setData(teaser.data)
      } else if (initialFunnel) {
        setFunnel(initialFunnel)
      }
    } catch {
      setDossierId(crypto.randomUUID())
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Persistance locale (instantanée) + sauvegarde serveur versionnée
  useEffect(() => {
    if (!hydrated || !dossierId) return
    const stored: StoredWizard = { dossierId, funnel, data, updatedAt: new Date().toISOString() }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // stockage indisponible
    }

    // Enregistré localement : micro-flash « Enregistrement… » → « Enregistré »
    // (on saute le premier passage = restauration au montage).
    if (firstPersist.current) {
      firstPersist.current = false
    } else {
      setSaveStatus('saving')
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setSaveStatus('saved'), 350)
    }

    // Site de test : on ne persiste PAS côté serveur (pas de vrai Dossier) —
    // la soumission finale écrit dans TestLead. localStorage suffit à la reprise.
    if (testMode) return
    const payload = JSON.stringify({ funnel, data })
    if (payload === lastSaved.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      lastSaved.current = payload
      setSaving(true)
      await saveDossierAction({ dossierId, funnel, data }).catch(() => null)
      setSaving(false)
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [hydrated, dossierId, funnel, data, testMode])

  const completeness: Completeness = useMemo(
    () => computeCompleteness(funnel, data),
    [funnel, data]
  )

  // ── Mutateurs immuables
  const setBien = useCallback(
    <K extends keyof DossierData['bien']>(key: K, value: DossierData['bien'][K]) => {
      setData((prev) => ({ ...prev, bien: { ...prev.bien, [key]: value } }))
    },
    []
  )

  const patch = useCallback((updater: (prev: DossierData) => DossierData) => {
    setData(updater)
  }, [])

  const trackStep = useCallback(
    (step: string) => {
      if (dossierId) {
        void trackDossierEvent({
          dossierId,
          type: 'WIZARD_STEP_COMPLETED',
          data: { step },
        })
      }
    },
    [dossierId]
  )

  // ── Tips contextuels (jamais bloquants)
  const tips: WizardTip[] = useMemo(() => {
    const list: WizardTip[] = []
    // Nudge LPP (formulaire-complet §2.3) : revenu salarié saisi sans
    // avoir de caisse de pension → le capital LPP peut améliorer le taux.
    const hasSalaire = data.emprunteurs.some((e) =>
      e.revenus.some((r) => r.typeActivite === 'SALARIE' || r.type === 'SALAIRE')
    )
    const hasLpp = data.emprunteurs.some((e) =>
      e.avoirs.some((a) => a.categorie === 'CAISSE_PENSION' || a.type === 'CAPITAL_LPP')
    )
    if (hasSalaire && !hasLpp) list.push({ id: 'lpp' })
    if (funnel === 'RENOUVELLEMENT_FROID') list.push({ id: 'coldMonitoring' })
    if (data.bien.labelEco && data.bien.labelEco !== 'non') list.push({ id: 'ecoLabel' })
    return list
  }, [data, funnel])

  // Estimation du temps restant : questions manquantes × 12 secondes.
  const minutesLeft = Math.max(1, Math.ceil((completeness.missing.length * 12) / 60))

  return {
    hydrated,
    dossierId,
    funnel,
    setFunnel,
    data,
    setBien,
    patch,
    completeness,
    tips,
    minutesLeft,
    saving,
    saveStatus,
    trackStep,
  }
}
