'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Chrono du temps écoulé depuis la création du signal.
// Vert < 5 min (le SLA), orange < 1 h, rouge au-delà.
export function SignalChrono({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(interval)
  }, [])

  const elapsed = Math.max(0, now - new Date(createdAt).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  const label =
    minutes < 60
      ? `${minutes} min`
      : minutes < 60 * 48
        ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
        : `${Math.floor(minutes / 1440)} j`

  return (
    <span
      className={cn(
        'text-data inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        minutes < 5
          ? 'bg-pilot-100 text-pilot-700'
          : minutes < 60
            ? 'bg-ambre-100 text-ambre-700'
            : 'bg-erreur-bg text-erreur'
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          minutes < 5 ? 'bg-pilot-600' : minutes < 60 ? 'bg-ambre-600' : 'bg-erreur'
        )}
      />
      {label}
    </span>
  )
}
