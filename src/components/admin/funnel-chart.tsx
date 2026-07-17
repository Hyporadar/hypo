// Entonnoir de conversion en flux (style Sankey) : nœuds reliés par des rubans
// qui se resserrent, et à chaque transition l'abandon (qui a quitté avant de
// continuer). Rendu SVG pur, sans dépendance.

export interface FunnelStepData {
  label: string
  count: number
}

const W = 920
const H = 250
const PAD_X = 16
const TOP = 52 // marge haute pour les libellés + volumes
const BAR_MAX = 150 // hauteur max d'un nœud
const NODE_W = 12

export function FunnelChart({ steps }: { steps: FunnelStepData[] }) {
  const n = Math.max(steps.length, 1)
  const top = steps[0]?.count ?? 0
  const max = Math.max(1, top)
  const colW = (W - PAD_X * 2) / n
  const h = (c: number) => (c / max) * BAR_MAX
  const xNode = (i: number) => PAD_X + i * colW
  const dropY = TOP + BAR_MAX + 24 // ligne des abandons (bas)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" role="img" aria-label="Entonnoir de conversion">
        {/* Rubans reliant chaque étape à la suivante (largeur = ceux qui continuent) */}
        {steps.slice(0, -1).map((s, i) => {
          const next = steps[i + 1]!
          const x0 = xNode(i) + NODE_W
          const x1 = xNode(i + 1)
          const hi = h(s.count)
          const hn = h(next.count)
          const cx = (x0 + x1) / 2
          const d = `M ${x0} ${TOP} L ${x1} ${TOP} L ${x1} ${TOP + hn} C ${cx} ${TOP + hn} ${cx} ${TOP + hi} ${x0} ${TOP + hi} Z`
          return <path key={`ribbon-${i}`} d={d} fill="var(--color-pilot-300)" opacity={0.65} />
        })}

        {/* Nœuds + libellés + volume */}
        {steps.map((s, i) => {
          const x = xNode(i)
          const ofTop = top > 0 ? Math.round((s.count / top) * 100) : 0
          return (
            <g key={`node-${i}`}>
              <rect x={x} y={TOP} width={NODE_W} height={h(s.count)} rx={3} fill="var(--color-pilot-600)" />
              <text x={x} y={TOP - 26} fontSize={12} fill="var(--color-ink-500)">
                {s.label}
              </text>
              <text x={x} y={TOP - 8} fontSize={15} fontWeight={600} fill="var(--color-ink-900)">
                {s.count}
                <tspan fill="var(--color-ink-400)" fontWeight={400}>
                  {' '}
                  · {ofTop}%
                </tspan>
              </text>
            </g>
          )
        })}

        {/* Abandons entre deux étapes (qui a quitté avant de continuer) */}
        {steps.slice(0, -1).map((s, i) => {
          const next = steps[i + 1]!
          const drop = s.count - next.count
          if (drop <= 0) return null
          const pct = s.count > 0 ? Math.round((drop / s.count) * 100) : 0
          const x = (xNode(i) + NODE_W + xNode(i + 1)) / 2
          return (
            <text
              key={`drop-${i}`}
              x={x}
              y={dropY}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-ambre-700)"
            >
              − {drop} abandon{drop > 1 ? 's' : ''} ({pct}%)
            </text>
          )
        })}
      </svg>
    </div>
  )
}
