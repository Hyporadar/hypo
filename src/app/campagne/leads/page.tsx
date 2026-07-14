import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { isCampagneAuthed } from '@/lib/campagne'
import { prisma } from '@/lib/prisma'
import { FUNNEL_LABELS } from '@/lib/admin-labels'
import { campagneLogout } from '@/server/actions/campagne'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function fmt(date: Date): string {
  return date.toLocaleString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })
}

export default async function CampagneLeadsPage() {
  if (!(await isCampagneAuthed())) redirect('/campagne')

  const [leads, total, complets] = await Promise.all([
    prisma.testLead.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.testLead.count(),
    prisma.testLead.count({ where: { completude: 100 } }),
  ])

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leads de campagne</h1>
          <p className="text-ink-500 text-sm">
            <span className="text-data">{total}</span> soumission{total > 1 ? 's' : ''} ·{' '}
            <span className="text-data">{complets}</span> complète{complets > 1 ? 's' : ''}
          </p>
        </div>
        <form action={campagneLogout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut data-icon="inline-start" />
            Déconnexion
          </Button>
        </form>
      </div>

      <div className="border-line mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-line text-ink-500 border-b text-left">
              <th className="px-4 py-3 font-medium">Reçu le</th>
              <th className="px-4 py-3 font-medium">Funnel</th>
              <th className="px-4 py-3 font-medium">Complétude</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Campagne</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-ink-500 px-4 py-10 text-center">
                  Aucun lead pour l&apos;instant.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-line hover:bg-surface-alt border-b last:border-0">
                  <td className="text-data px-4 py-3 whitespace-nowrap">
                    <Link href={`/campagne/leads/${lead.id}`} className="hover:underline">
                      {fmt(lead.createdAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{FUNNEL_LABELS[lead.funnel] ?? lead.funnel}</Badge>
                  </td>
                  <td className="text-data px-4 py-3">{lead.completude}%</td>
                  <td className="px-4 py-3">{lead.email ?? '—'}</td>
                  <td className="text-data px-4 py-3">{lead.phone ?? '—'}</td>
                  <td className="px-4 py-3">{lead.utmSource ?? '—'}</td>
                  <td className="px-4 py-3">{lead.utmCampaign ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
