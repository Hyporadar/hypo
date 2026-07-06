import { formatCHF } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { Card, CardContent } from '@/components/ui/card'

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

// Les chiffres du mois du closer connecté.
export default async function MyStatsPage() {
  const session = await requireRole('CLOSER', 'ADMIN')
  const closerId = session.user.id

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [treatedSignals, myLeads, contacts, tenders, signed, commissions] = await Promise.all([
    prisma.signal.count({
      where: {
        treatedAt: { gte: monthStart },
        OR: [{ claimedById: closerId }, { lead: { closerId } }],
      },
    }),
    prisma.lead.findMany({
      where: { closerId },
      select: {
        id: true,
        createdAt: true,
        statusHistory: {
          where: { toStatus: 'CONTACTE' },
          orderBy: { changedAt: 'asc' },
          take: 1,
          select: { changedAt: true },
        },
      },
    }),
    prisma.leadStatusChange.count({
      where: { changedById: closerId, toStatus: 'CONTACTE', changedAt: { gte: monthStart } },
    }),
    prisma.leadStatusChange.count({
      where: {
        changedById: closerId,
        toStatus: 'ENVOYE_PARTENAIRE',
        changedAt: { gte: monthStart },
      },
    }),
    prisma.leadStatusChange.count({
      where: { changedById: closerId, toStatus: 'SIGNE', changedAt: { gte: monthStart } },
    }),
    prisma.commissionEntry.aggregate({
      where: { beneficiaryId: closerId, kind: 'VARIABLE_CLOSER', createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ])

  const responseMinutes = myLeads
    .map((lead) => lead.statusHistory[0])
    .filter((h): h is { changedAt: Date } => Boolean(h))
    .map((h, i) => (h.changedAt.getTime() - myLeads[i]!.createdAt.getTime()) / 60_000)
    .filter((minutes) => minutes >= 0)
  const medianResponse = median(responseMinutes)

  const stats = [
    { label: 'Signaux traités', value: String(treatedSignals) },
    {
      label: 'Temps de réponse médian',
      value: medianResponse !== null ? `${Math.round(medianResponse)} min` : '—',
    },
    { label: 'Contacts établis', value: String(contacts) },
    { label: "Appels d'offres lancés", value: String(tenders) },
    { label: 'Signatures', value: String(signed) },
    {
      label: 'Commission variable estimée',
      value: formatCHF(Number(commissions._sum.amount ?? 0)),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Mes stats</h1>
        <p className="text-ink-500 mt-1 text-sm">Le mois en cours. La vitesse est le produit.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                {stat.label}
              </p>
              <p className="text-data mt-1 text-3xl">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
