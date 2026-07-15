// Événements analytics côté client — poussés dans `window.dataLayer`
// (compatible GTM / GA4). No-op si aucun outil n'est branché : aucun backend,
// aucune dépendance. Sûr à appeler depuis n'importe quel composant client.
export function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> }
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event, ...props })
}
