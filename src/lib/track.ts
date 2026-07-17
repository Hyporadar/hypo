// Événements analytics côté client — poussés dans `window.dataLayer`
// (compatible GTM / GA4). No-op si aucun outil n'est branché : aucun backend,
// aucune dépendance. Sûr à appeler depuis n'importe quel composant client.
export function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> }
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event, ...props })
}

// ─── Entonnoir de conversion (persisté en base, dédupliqué par visiteur) ──
// Les 4 étapes du parcours, dans l'ordre.
export const FUNNEL_STEPS = ['visit', 'criteria', 'advance', 'contact'] as const
export type FunnelStep = (typeof FUNNEL_STEPS)[number]

const SID_KEY = 'hp-fsid' // id de session (visiteur) anonyme, stable
const DONE_KEY = 'hp-fsteps' // étapes déjà envoyées par ce navigateur

function sessionId(): string {
  let id = window.localStorage.getItem(SID_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
    window.localStorage.setItem(SID_KEY, id)
  }
  return id
}

/**
 * Marque une étape de l'entonnoir pour ce visiteur (une fois par navigateur).
 * Fire-and-forget : ne bloque jamais, n'échoue jamais bruyamment.
 */
export function trackFunnel(step: FunnelStep): void {
  if (typeof window === 'undefined') return
  try {
    const done = new Set<string>(JSON.parse(window.localStorage.getItem(DONE_KEY) ?? '[]'))
    if (done.has(step)) return
    done.add(step)
    window.localStorage.setItem(DONE_KEY, JSON.stringify([...done]))

    const body = JSON.stringify({ sessionId: sessionId(), step })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    } else {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined)
    }
  } catch {
    // stockage indisponible : on ignore
  }
}
