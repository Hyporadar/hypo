// Motif signature : la ligne de temps de l'hypothèque.
// Point ambre sur la fenêtre d'action 12–18 mois avant l'échéance.
export function MortgageTimeline({
  startLabel,
  windowLabel,
  endLabel,
}: {
  startLabel: string
  windowLabel: string
  endLabel: string
}) {
  return (
    <div className="w-full" aria-hidden>
      <div className="relative h-px w-full bg-line-strong">
        <span className="bg-pilot-600 absolute left-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full" />
        <span className="bg-ambre-500 ring-ambre-100 absolute left-[68%] top-1/2 size-3 -translate-y-1/2 rounded-full ring-4" />
        <span className="border-line-strong absolute right-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full border bg-white" />
      </div>
      <div className="text-ink-500 mt-3 flex justify-between text-xs">
        <span className="text-data">{startLabel}</span>
        <span className="text-data text-ambre-700 -ml-10">{windowLabel}</span>
        <span className="text-data">{endLabel}</span>
      </div>
    </div>
  )
}
