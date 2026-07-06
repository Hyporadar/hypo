import { formatCHF, formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// Modèle Kala : transparence totale du partner sur ses gains.
export default async function PartnerEarningsPage() {
  const session = await requireRole('PARTNER')

  const commissions = await prisma.commissionEntry.findMany({
    where: { beneficiaryId: session.user.id }, // étanchéité : uniquement les siennes
    include: { lead: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const due = commissions
    .filter((c) => c.status === 'DUE')
    .reduce((s, c) => s + Number(c.amount), 0)
  const paid = commissions
    .filter((c) => c.status === 'PAYEE')
    .reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Mes gains</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">Cumul</p>
            <p className="text-data mt-1 text-3xl">{formatCHF(due + paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              À verser
            </p>
            <p className="text-data text-ambre-700 mt-1 text-3xl">{formatCHF(due)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">Versé</p>
            <p className="text-data text-pilot-700 mt-1 text-3xl">{formatCHF(paid)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="px-6 py-4">
          {commissions.length === 0 ? (
            <p className="text-ink-500 py-8 text-center text-sm">
              Vos commissions apparaîtront ici dès le premier dossier signé.
            </p>
          ) : (
            <ul className="divide-line divide-y">
              {commissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-medium">{c.lead.name ?? '—'}</span>
                  <span className="text-data text-ink-500">{formatDate(c.createdAt)}</span>
                  <span className="text-data">{formatCHF(Number(c.amount))}</span>
                  <Badge
                    variant="secondary"
                    className={
                      c.status === 'PAYEE'
                        ? 'bg-pilot-100 text-pilot-700'
                        : 'bg-ambre-100 text-ambre-700'
                    }
                  >
                    {c.status === 'PAYEE' ? 'Payée' : 'Due'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
