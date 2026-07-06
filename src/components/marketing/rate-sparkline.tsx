// Mini-graphique d'évolution du fixe 10 ans — SVG pur, sans dépendance.
export function RateSparkline({ points }: { points: Array<{ rate: number; at: Date }> }) {
  if (points.length < 2) return null

  const W = 560
  const H = 120
  const PAD = 8
  const rates = points.map((p) => p.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const span = Math.max(0.05, max - min)
  const times = points.map((p) => p.at.getTime())
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  const tSpan = Math.max(1, t1 - t0)

  const coords = points.map((p) => {
    const x = PAD + ((p.at.getTime() - t0) / tSpan) * (W - PAD * 2)
    const y = H - PAD - ((p.rate - min) / span) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Évolution du taux fixe 10 ans"
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="#1B6B52"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.length > 0 ? (
        <circle
          cx={coords[coords.length - 1]!.split(',')[0]}
          cy={coords[coords.length - 1]!.split(',')[1]}
          r="4"
          fill="#1B6B52"
        />
      ) : null}
    </svg>
  )
}
