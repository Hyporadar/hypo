'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'

// Confirmation visuelle de l'adresse : géocodage api3.geo.admin.ch + carte
// Leaflet (tuiles OSM). Dégradation propre hors ligne : boutons seuls.
export function MapConfirm({
  address,
  confirmed,
  onConfirm,
  onGeocoded,
  labels,
}: {
  address: string
  confirmed: boolean
  onConfirm: (ok: boolean) => void
  onGeocoded?: (lat: number, lng: number) => void
  labels: { confirm: string; wrong: string; loading: string; unavailable: string }
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  // Callback dans une ref : sa nouvelle identité à chaque rendu du parent ne
  // doit PAS relancer le géocodage (boucle infinie fetch → patch → rendu).
  const onGeocodedRef = useRef(onGeocoded)
  useEffect(() => {
    onGeocodedRef.current = onGeocoded
  })

  useEffect(() => {
    let disposed = false
    let map: import('leaflet').Map | null = null

    async function init() {
      if (!mapRef.current || !address.trim()) return
      try {
        // Géocodage officiel suisse (gratuit, sans clé).
        const res = await fetch(
          `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&limit=1&searchText=${encodeURIComponent(address)}`
        )
        const json = (await res.json()) as {
          results?: Array<{ attrs: { lat: number; lon: number } }>
        }
        // Un run « disposed » (Strict Mode / adresse changée) ne touche plus l'état.
        if (disposed) return
        const hit = json.results?.[0]?.attrs
        if (!hit) {
          setState('unavailable')
          return
        }
        onGeocodedRef.current?.(hit.lat, hit.lon)

        const L = await import('leaflet')
        if (disposed || !mapRef.current) return
        map = L.map(mapRef.current, {
          center: [hit.lat, hit.lon],
          zoom: 17,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
        })
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(map)
        L.circleMarker([hit.lat, hit.lon], {
          radius: 10,
          color: '#1B6B52',
          fillColor: '#1B6B52',
          fillOpacity: 0.6,
        }).addTo(map)
        setState('ready')
      } catch {
        if (!disposed) setState('unavailable')
      }
    }
    void init()
    return () => {
      disposed = true
      map?.remove()
    }
  }, [address])

  return (
    <div className="space-y-3">
      {state !== 'unavailable' ? (
        <div
          ref={mapRef}
          role="img"
          aria-label={address}
          className="border-line bg-surface-alt h-52 w-full overflow-hidden rounded-xl border"
        >
          {state === 'loading' ? (
            <p className="text-ink-500 flex h-full items-center justify-center text-sm">
              {labels.loading}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-500 border-line rounded-xl border bg-white p-4 text-sm">
          {labels.unavailable}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={confirmed ? 'default' : 'outline'}
          onClick={() => onConfirm(true)}
        >
          {labels.confirm}
        </Button>
        <Button type="button" variant="outline" onClick={() => onConfirm(false)}>
          {labels.wrong}
        </Button>
      </div>
    </div>
  )
}
