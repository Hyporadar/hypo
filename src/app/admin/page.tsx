import type { Metadata } from 'next'
import Link from 'next/link'
import { formatCHF } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { PartnerHome } from '@/components/admin/partner-home'
import { SignalQueue } from '@/components/admin/signal-queue'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Panel interne — HypoRadar',
  robots: { index: false },
}

// Home du panel : le contenu dépend du rôle.
// CLOSER → sa file de signaux (la vitesse est le produit).
// PARTNER → ses leads + envoyer un client.
// ADMIN → vue d'ensemble.
export default async function AdminHomePage() {
  const session = await requireRole('ADMIN', 'CLOSER', 'PARTNER')
  const role = session.user.role

  if (role === 'CLOSER') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ma file</h1>
          <p className="text-ink-500 mt-1 text-sm">
            Signaux ouverts, triés par priorité. Objectif : premier contact en moins de 5 minutes.
          </p>
        </div>
        <SignalQueue closerId={session.user.id} />
      </div>
    )
  }

  if (role === 'PARTNER') {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Mes leads</h1>
        <PartnerHome partnerId={session.user.id} />
      </div>
    )
  }

  // ADMIN : vue d'ensemble
  const [openSignals, newLeads, hotLeads, monitored, signed, dueCommissions] = await Promise.all([
    prisma.signal.count({ where: { status: 'OUVERT' } }),
    prisma.lead.count({ where: { status: 'NOUVEAU' } }),
    prisma.lead.count({
      where: { funnel: 'RENOUVELLEMENT_CHAUD', status: { notIn: ['SIGNE', 'PERDU'] } },
    }),
    prisma.lead.count({ where: { status: 'NURTURING' } }),
    prisma.lead.count({ where: { status: 'SIGNE' } }),
    prisma.commissionEntry.aggregate({ where: { status: 'DUE' }, _sum: { amount: true } }),
  ])

  const cards = [
    { label: 'Signaux ouverts', value: String(openSignals), href: '/admin/leads' },
    { label: 'Leads nouveaux', value: String(newLeads), href: '/admin/leads?statut=NOUVEAU' },
    { label: 'Chauds en cours', value: String(hotLeads), href: '/admin/pipeline' },
    { label: 'Sous surveillance', value: String(monitored), href: '/admin/echeancier' },
    { label: 'Signés', value: String(signed), href: '/admin/stats' },
    {
      label: 'Commissions dues',
      value: formatCHF(Number(dueCommissions._sum.amount ?? 0)),
      href: '/admin/partenaires',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Vue d’ensemble</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:border-pilot-200 transition-colors">
              <CardContent className="p-5">
                <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                  {card.label}
                </p>
                <p className="text-data mt-1 text-3xl">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
