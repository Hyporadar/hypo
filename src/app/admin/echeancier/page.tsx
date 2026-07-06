import { formatCHF } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { Card, CardContent } from '@/components/ui/card'

// Le stock d'hypothèques surveillées par trimestre d'échéance, sur 24 mois :
// le pipeline futur du business.
export default async function EcheancierPage() {
  await requireRole('ADMIN')

  const now = new Date()
  const horizon = new Date(now)
  horizon.setUTCMonth(horizon.getUTCMonth() + 24)

  const mortgages = await prisma.mortgage.findMany({
    where: { endDate: { gte: now, lte: horizon } },
    select: { endDate: true, remainingAmount: true },
  })

  // Agrégation par trimestre calendaire.
  const quarters = new Map<string, { count: number; total: number }>()
  for (let i = 0; i < 8; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i * 3, 1))
    const key = `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`
    if (!quarters.has(key)) quarters.set(key, { count: 0, total: 0 })
  }
  for (const m of mortgages) {
    const key = `${m.endDate.getUTCFullYear()}-T${Math.floor(m.endDate.getUTCMonth() / 3) + 1}`
    const entry = quarters.get(key) ?? { count: 0, total: 0 }
    entry.count++
    entry.total += Number(m.remainingAmount)
    quarters.set(key, entry)
  }

  const rows = [...quarters.entries()].sort(([a], [b]) => a.localeCompare(b))
  const maxTotal = Math.max(1, ...rows.map(([, v]) => v.total))
  const grandTotal = rows.reduce((s, [, v]) => s + v.total, 0)
  const grandCount = rows.reduce((s, [, v]) => s + v.count, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Échéancier</h1>
        <p className="text-ink-500 mt-1 text-sm">
          {grandCount} hypothèques surveillées arrivent à échéance dans les 24 mois —{' '}
          <span className="text-data">{formatCHF(grandTotal)}</span> de volume.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          {rows.map(([quarter, { count, total }]) => (
            <div key={quarter} className="flex items-center gap-4">
              <span className="text-data w-20 shrink-0 text-sm">{quarter}</span>
              <div className="bg-surface-alt h-7 flex-1 overflow-hidden rounded-md">
                <div
                  className="bg-pilot-600 flex h-full items-center rounded-md px-2"
                  style={{ width: `${Math.max(2, (total / maxTotal) * 100)}%` }}
                >
                  {total > 0 ? (
                    <span className="text-data text-xs whitespace-nowrap text-white">
                      {formatCHF(total)}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="text-data text-ink-500 w-14 shrink-0 text-right text-sm">
                {count}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
