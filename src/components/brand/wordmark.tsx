import { cn } from '@/lib/utils'

// Logo typographique : « Hypo » encre / « Radar » vert marque.
// Sur fond vert-700 : tout en clair, « Radar » en vert-200 (variante onDark).
export function Wordmark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span
      className={cn('font-display text-xl font-bold tracking-tight', className)}
      aria-label="HypoRadar"
    >
      <span className={onDark ? 'text-[#F7F4EC]' : 'text-ink-900'}>Hypo</span>
      <span className={onDark ? 'text-pilot-200' : 'text-pilot-600'}>Radar</span>
    </span>
  )
}
