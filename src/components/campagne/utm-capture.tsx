'use client'

import { useEffect } from 'react'

// Capture first-touch des paramètres de campagne (utm_*/gclid + referrer)
// dans localStorage, lus à la soumission du formulaire de test.
export function UtmCapture() {
  useEffect(() => {
    try {
      if (window.localStorage.getItem('hp-test-utm')) return // premier contact conservé
      const p = new URLSearchParams(window.location.search)
      const utm = {
        source: p.get('utm_source') ?? (p.get('gclid') ? 'google-ads' : undefined),
        medium: p.get('utm_medium') ?? undefined,
        campaign: p.get('utm_campaign') ?? undefined,
        referrer: document.referrer || undefined,
      }
      if (utm.source || utm.medium || utm.campaign || utm.referrer) {
        window.localStorage.setItem('hp-test-utm', JSON.stringify(utm))
      }
    } catch {
      // localStorage indisponible : pas d'attribution
    }
  }, [])
  return null
}
