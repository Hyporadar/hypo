import { formatCHF, formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { ApprovePartnerButton } from '@/components/admin/user-actions'
import { MarkPaidButton } from '@/components/admin/lead-actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PartnersAdminPage() {
  await requireRole('ADMIN')

  const partners = await prisma.user.findMany({
    where: { role: 'PARTNER' },
    include: {
      referredLeads: { select: { status: true } },
      commissionEntries: {
        where: { kind: 'APPORT_PARTENAIRE' },
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Partenaires</h1>

      <div className="space-y-4">
        {partners.map((partner) => {
          const due = partner.commissionEntries.filter((c) => c.status === 'DUE')
          const paid = partner.commissionEntries.filter((c) => c.status === 'PAYEE')
          const dueTotal = due.reduce((s, c) => s + Number(c.amount), 0)
          const paidTotal = paid.reduce((s, c) => s + Number(c.amount), 0)
          const signed = partner.referredLeads.filter((l) => l.status === 'SIGNE').length

          return (
            <Card key={partner.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="font-display text-lg">{partner.name}</CardTitle>
                  <Badge variant="secondary" className="text-data">
                    ref={partner.partnerCode ?? '—'}
                  </Badge>
                  {partner.partnerApprovedAt ? (
                    <Badge className="bg-pilot-100 text-pilot-700">Validé</Badge>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Badge className="bg-ambre-100 text-ambre-700">En attente</Badge>
                      <ApprovePartnerButton userId={partner.id} />
                    </span>
                  )}
                  <span className="text-ink-500 ml-auto text-sm">
                    {partner.referredLeads.length} leads apportés · {signed} signés
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="text-data mb-3 flex gap-6 text-sm">
                  <span>
                    <span className="text-ink-500 font-sans">Dû : </span>
                    {formatCHF(dueTotal)}
                  </span>
                  <span>
                    <span className="text-ink-500 font-sans">Payé : </span>
                    {formatCHF(paidTotal)}
                  </span>
                </div>
                {partner.commissionEntries.length > 0 ? (
                  <ul className="divide-line divide-y">
                    {partner.commissionEntries.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span>{c.lead.name ?? '—'}</span>
                        <span className="text-data text-ink-500">{formatDate(c.createdAt)}</span>
                        <span className="text-data">{formatCHF(Number(c.amount))}</span>
                        {c.status === 'DUE' ? (
                          <MarkPaidButton commissionId={c.id} />
                        ) : (
                          <Badge variant="secondary" className="bg-pilot-100 text-pilot-700">
                            Payé
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-500 text-sm">Aucune commission pour l’instant.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
