import { FUNNEL_LABELS, PIPELINE_ORDER, STATUT_LABELS } from '@/lib/admin-labels'
import { formatCHF } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { SpendForm } from '@/components/admin/spend-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  if (min < 60 * 48) return `${Math.round(min / 60)} h`
  return `${Math.round(min / 1440)} j`
}

// Nos kill criteria : conversions, CAC, temps de réponse, taux de signature.
export default async function StatsPage() {
  await requireRole('ADMIN')

  const [leads, statusChanges, spends] = await Promise.all([
    prisma.lead.findMany({
      select: {
        id: true,
        funnel: true,
        status: true,
        locale: true,
        utmSource: true,
        partnerId: true,
        createdAt: true,
      },
    }),
    prisma.leadStatusChange.findMany({
      where: { toStatus: 'CONTACTE' },
      orderBy: { changedAt: 'asc' },
      select: { leadId: true, changedAt: true, changedById: true },
    }),
    prisma.channelSpend.findMany(),
  ])

  const total = leads.length || 1

  // Conversions par étape et par funnel : % de leads ayant ATTEINT chaque étape.
  const funnels = ['ACHAT', 'RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID'] as const
  const reachedIndex = (status: string) => PIPELINE_ORDER.indexOf(status as never)
  const conversionRows = PIPELINE_ORDER.map((stage) => {
    const stageIdx = reachedIndex(stage)
    const byFunnel = funnels.map((funnel) => {
      const pool = leads.filter((l) => l.funnel === funnel)
      if (pool.length === 0) return null
      const reached = pool.filter(
        (l) => reachedIndex(l.status) >= stageIdx || l.status === 'SIGNE'
      ).length
      return Math.round((reached / pool.length) * 100)
    })
    return { stage, byFunnel }
  })

  // Leads par source et par langue.
  const bySource = new Map<string, number>()
  for (const lead of leads) {
    const source = lead.partnerId ? 'partenaire' : (lead.utmSource ?? 'organique')
    bySource.set(source, (bySource.get(source) ?? 0) + 1)
  }
  const byLocale = new Map<string, number>()
  for (const lead of leads) byLocale.set(lead.locale, (byLocale.get(lead.locale) ?? 0) + 1)

  // CAC par canal : dépenses saisies / leads du canal.
  const spendByChannel = new Map<string, number>()
  for (const s of spends) {
    spendByChannel.set(s.channel, (spendByChannel.get(s.channel) ?? 0) + Number(s.amount))
  }

  // Temps de première réponse médian (NOUVEAU → CONTACTE).
  const firstContactByLead = new Map<string, Date>()
  for (const change of statusChanges) {
    if (!firstContactByLead.has(change.leadId))
      firstContactByLead.set(change.leadId, change.changedAt)
  }
  const responseMinutes: number[] = []
  for (const lead of leads) {
    const contact = firstContactByLead.get(lead.id)
    if (contact) responseMinutes.push((contact.getTime() - lead.createdAt.getTime()) / 60_000)
  }
  const medianResponse = median(responseMinutes)

  // Taux de signature (hors froids en surveillance).
  const closed = leads.filter((l) => l.status === 'SIGNE' || l.status === 'PERDU')
  const signRate = closed.length
    ? Math.round((leads.filter((l) => l.status === 'SIGNE').length / closed.length) * 100)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Stats</h1>
        <p className="text-ink-500 mt-1 text-sm">Les kill criteria, sans maquillage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              Temps de 1re réponse médian
            </p>
            <p className="text-data mt-1 text-3xl">
              {medianResponse !== null ? formatMinutes(medianResponse) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              Taux de signature
            </p>
            <p className="text-data mt-1 text-3xl">{signRate !== null ? `${signRate}%` : '—'}</p>
            <p className="text-ink-400 mt-0.5 text-xs">signés / (signés + perdus)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">Leads</p>
            <p className="text-data mt-1 text-3xl">{leads.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversions par étape et par funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">
            Conversion par étape (% de leads ayant atteint l’étape)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-6 pb-6">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-ink-500 border-line border-b text-left text-xs">
                <th className="py-2 font-medium">Étape</th>
                {funnels.map((f) => (
                  <th key={f} className="py-2 font-medium">
                    {FUNNEL_LABELS[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conversionRows.map((row) => (
                <tr key={row.stage} className="border-line border-b last:border-0">
                  <td className="py-2">{STATUT_LABELS[row.stage]}</td>
                  {row.byFunnel.map((value, i) => (
                    <td key={i} className="text-data py-2">
                      {value === null ? '—' : `${value}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CAC par canal */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">CAC par canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-500 border-line border-b text-left text-xs">
                  <th className="py-2 font-medium">Canal</th>
                  <th className="py-2 font-medium">Leads</th>
                  <th className="py-2 font-medium">Dépense</th>
                  <th className="py-2 font-medium">CAC</th>
                </tr>
              </thead>
              <tbody>
                {[...bySource.entries()]
                  .sort(([, a], [, b]) => b - a)
                  .map(([channel, count]) => {
                    const spend = spendByChannel.get(channel) ?? 0
                    return (
                      <tr key={channel} className="border-line border-b last:border-0">
                        <td className="py-2">{channel}</td>
                        <td className="text-data py-2">{count}</td>
                        <td className="text-data py-2">{spend ? formatCHF(spend) : '—'}</td>
                        <td className="text-data py-2">
                          {spend ? formatCHF(Math.round(spend / count)) : '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
            <div className="border-line border-t pt-4">
              <p className="mb-3 text-xs font-semibold">Saisir une dépense (canal / mois)</p>
              <SpendForm />
            </div>
          </CardContent>
        </Card>

        {/* Par langue */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Leads par langue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {[...byLocale.entries()].map(([locale, count]) => (
              <div key={locale} className="flex items-center gap-3">
                <span className="text-data w-8 text-sm uppercase">{locale}</span>
                <div className="bg-surface-alt h-5 flex-1 overflow-hidden rounded">
                  <div
                    className="bg-pilot-600 h-full rounded"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className="text-data text-ink-500 w-10 text-right text-sm">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
