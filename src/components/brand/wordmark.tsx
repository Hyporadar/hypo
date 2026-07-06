import { cn } from '@/lib/utils'

// Logo typographique : « Hypo » encre / « Pilot » vert Pilote.
// Sur fond vert-700 : tout en clair, « Pilot » en vert-200 (variante onDark).
export function Wordmark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span
      className={cn('font-display text-xl font-bold tracking-tight', className)}
      aria-label="HypoPilot"
    >
      <span className={onDark ? 'text-[#F7F4EC]' : 'text-ink-900'}>Hypo</span>
      <span className={onDark ? 'text-pilot-200' : 'text-pilot-600'}>Pilot</span>
    </span>
  )
}
