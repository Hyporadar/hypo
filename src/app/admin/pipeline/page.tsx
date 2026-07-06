import Link from 'next/link'
import { FUNNEL_LABELS, PIPELINE_ORDER, STATUT_LABELS } from '@/lib/admin-labels'
import { formatCHF } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { Badge } from '@/components/ui/badge'

// Commission potentielle ~0,5% du montant financé (barème v1).
const COMMISSION_RATE = 0.005

export default async function PipelinePage() {
  await requireRole('ADMIN')

  const leads = await prisma.lead.findMany({
    where: { status: { in: [...PIPELINE_ORDER] } },
    include: {
      mortgage: { select: { remainingAmount: true } },
      purchaseProject: { select: { price: true, ownFunds: true } },
    },
    orderBy: { score: 'desc' },
  })

  const columns = PIPELINE_ORDER.map((status) => {
    const items = leads.filter((l) => l.status === status)
    const potential = items.reduce((sum, lead) => {
      const amount = lead.mortgage
        ? Number(lead.mortgage.remainingAmount)
        : lead.purchaseProject
          ? Number(lead.purchaseProject.price) - Number(lead.purchaseProject.ownFunds)
          : 0
      return sum + amount * COMMISSION_RATE
    }, 0)
    return { status, items, potential }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Pipeline</h1>
        <p className="text-ink-500 mt-1 text-sm">
          Commission potentielle par colonne (~0,5% du montant financé).
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.status} className="w-64 shrink-0">
            <div className="border-line rounded-t-xl border border-b-0 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{STATUT_LABELS[col.status]}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {col.items.length}
                </Badge>
              </div>
              <p className="text-data text-pilot-700 mt-0.5 text-xs">
                {formatCHF(Math.round(col.potential))}
              </p>
            </div>
            <div className="border-line bg-surface-alt/50 min-h-40 space-y-2 rounded-b-xl border p-2">
              {col.items.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="border-line hover:border-pilot-200 block rounded-lg border bg-white p-2.5 text-xs transition-colors"
                >
                  <p className="truncate font-medium">{lead.name ?? lead.email ?? '—'}</p>
                  <p className="text-ink-500 mt-0.5 flex justify-between">
                    <span>{FUNNEL_LABELS[lead.funnel]}</span>
                    <span className="text-data">{lead.score}</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
