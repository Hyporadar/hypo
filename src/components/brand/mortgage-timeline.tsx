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
      <div className="bg-line-strong relative h-px w-full">
        <span className="bg-pilot-600 absolute top-1/2 left-0 size-2.5 -translate-y-1/2 rounded-full" />
        <span className="bg-ambre-500 ring-ambre-100 absolute top-1/2 left-[68%] size-3 -translate-y-1/2 rounded-full ring-4" />
        <span className="border-line-strong absolute top-1/2 right-0 size-2.5 -translate-y-1/2 rounded-full border bg-white" />
      </div>
      <div className="text-ink-500 mt-3 flex justify-between text-xs">
        <span className="text-data">{startLabel}</span>
        <span className="text-data text-ambre-700 -ml-10">{windowLabel}</span>
        <span className="text-data">{endLabel}</span>
      </div>
    </div>
  )
}
