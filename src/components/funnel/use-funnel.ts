'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Attribution : UTM + referrer + code apporteur, capturés au premier écran
// (first touch) et conservés dans le brouillon localStorage.
export interface Attribution {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  referrer?: string
  ref?: string // ?ref=CODE → partenaire B2B
}

interface StoredDraft<T> {
  draftId: string
  step: number
  values: T
  attribution: Attribution
  updatedAt: string
}

function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search)
  const pick = (k: string) => params.get(k)?.slice(0, 200) || undefined
  return {
    utmSource: pick('utm_source'),
    utmMedium: pick('utm_medium'),
    utmCampaign: pick('utm_campaign'),
    utmTerm: pick('utm_term'),
    utmContent: pick('utm_content'),
    referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
    ref: pick('ref'),
  }
}

/**
 * Moteur de formulaire multi-étapes : une question par écran, brouillon
 * localStorage à chaque frappe (détection des abandons), navigation
 * avant/arrière. La persistance serveur (dès l'email connu) est du ressort
 * du funnel via l'action saveDraft — le hook expose tout ce qu'il faut.
 */
export function useFunnel<T extends Record<string, unknown>>(storageKey: string, initial: T) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<T>(initial)
  const [attribution, setAttribution] = useState<Attribution>({})
  const [draftId, setDraftId] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const key = `hp-draft-${storageKey}`
  const initialRef = useRef(initial)

  // Restauration + capture d'attribution, une seule fois côté client.
  /* eslint-disable react-hooks/set-state-in-effect -- restauration du brouillon au montage, volontairement synchrone */
  useEffect(() => {
    let stored: StoredDraft<T> | null = null
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) stored = JSON.parse(raw) as StoredDraft<T>
    } catch {
      // brouillon corrompu : on repart de zéro
    }
    const fresh = captureAttribution()
    if (stored) {
      setDraftId(stored.draftId)
      setStep(stored.step)
      setValues({ ...initialRef.current, ...stored.values })
      // first touch : les UTM déjà capturés priment, les absents se complètent
      setAttribution({ ...fresh, ...stored.attribution })
    } else {
      setDraftId(crypto.randomUUID())
      setAttribution(fresh)
    }
    setHydrated(true)
  }, [key])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persistance locale à chaque changement.
  useEffect(() => {
    if (!hydrated || !draftId) return
    const draft: StoredDraft<T> = {
      draftId,
      step,
      values,
      attribution,
      updatedAt: new Date().toISOString(),
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(draft))
    } catch {
      // stockage plein ou bloqué : non bloquant
    }
  }, [hydrated, draftId, step, values, attribution, key])

  const setValue = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }))
  }, [])

  const next = useCallback(() => setStep((s) => s + 1), [])
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // rien à faire
    }
  }, [key])

  return {
    step,
    setStep,
    values,
    setValue,
    attribution,
    draftId,
    hydrated,
    next,
    back,
    clearDraft,
  }
}
