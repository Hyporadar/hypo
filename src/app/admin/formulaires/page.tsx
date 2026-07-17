import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { formatAge, FUNNEL_LABELS } from '@/lib/admin-labels'
import { formatCHF } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { PAGE_SIZE, parseTableParams } from '@/lib/table'
import {
  ECHEANCE_LABELS,
  shortLeadFigures,
  STATE_BADGE,
  STATE_LABELS,
} from '@/lib/admin/short-lead'
import { requireRole } from '@/server/admin/guard'
import { DataTable, type ColumnDef } from '@/components/admin/data-table'
import { MiniBarChart, type DayPoint } from '@/components/admin/mini-bar-chart'
import { FunnelChart } from '@/components/admin/funnel-chart'
import { TableToolbar } from '@/components/admin/table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Row = Prisma.TestLeadGetPayload<object>

const SORT_MAP: Record<string, keyof Prisma.TestLeadOrderByWithRelationInput> = {
  createdAt: 'createdAt',
  completude: 'completude',
}

// Leads issus du formulaire court (TestLead) : téléphone, email, hypothèque,
// revenu, échéance + finançabilité calculée. Vue admin principale.
export default async function FormLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRole('ADMIN')
  const params = parseTableParams(await searchParams, 'createdAt')

  const where: Prisma.TestLeadWhereInput = {
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { email: { contains: params.q, mode: 'insensitive' } },
            { phone: { contains: params.q } },
          ],
        }
      : {}),
    ...(params.filters.funnel ? { funnel: params.filters.funnel } : {}),
    ...(params.filters.echeance ? { echeance: params.filters.echeance } : {}),
    ...(params.filters.source === 'organique'
      ? { utmSource: null }
      : params.filters.source
        ? { utmSource: params.filters.source }
        : {}),
  }

  const sortKey = SORT_MAP[params.sort] ? params.sort : 'createdAt'
  const orderBy = { [SORT_MAP[sortKey]!]: params.dir } as Prisma.TestLeadOrderByWithRelationInput

  const [rows, total, sources] = await Promise.all([
    prisma.testLead.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.testLead.count({ where }),
    prisma.testLead.groupBy({ by: ['utmSource'], where: { utmSource: { not: null } } }),
  ])

  // ── KPIs & graphiques : valeur totale des hypothèques demandées + volume,
  // le tout par jour sur 30 jours (agrégat global, hors filtres du tableau).
  const statLeads = await prisma.testLead.findMany({ select: { createdAt: true, data: true } })
  let totalValue = 0
  const totalCount = statLeads.length
  for (const l of statLeads) totalValue += shortLeadFigures(l.data).montant ?? 0

  const DAYS = 30
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const days: DayPoint[] = []
  const byKey = new Map<string, DayPoint>()
  for (let i = DAYS - 1; i >= 0; i--) {
    const key = dayKey(new Date(todayUtc - i * 86_400_000))
    const point: DayPoint = { key, label: `${key.slice(8, 10)}.${key.slice(5, 7)}`, count: 0, value: 0 }
    byKey.set(key, point)
    days.push(point)
  }
  for (const l of statLeads) {
    const p = byKey.get(dayKey(l.createdAt))
    if (!p) continue
    p.count += 1
    p.value += shortLeadFigures(l.data).montant ?? 0
  }

  // ── Entonnoir de conversion (30 derniers jours), visiteurs uniques / étape.
  const funnelSince = new Date(todayUtc - (DAYS - 1) * 86_400_000)
  const funnelGroups = await prisma.funnelEvent.groupBy({
    by: ['step'],
    _count: { _all: true },
    where: { createdAt: { gte: funnelSince } },
  })
  const funnelCount = (step: string) =>
    funnelGroups.find((g) => g.step === step)?._count._all ?? 0
  const funnelSteps = [
    { label: 'Visite', count: funnelCount('visit') },
    { label: 'Résultats (pop-up)', count: funnelCount('criteria') },
    { label: 'Aller plus loin', count: funnelCount('advance') },
    { label: 'Contact envoyé', count: funnelCount('contact') },
  ]

  const columns: Array<ColumnDef<Row>> = [
    {
      key: 'createdAt',
      label: 'Reçu',
      sortable: true,
      className: 'text-data',
      render: (r) => (
        <Link href={`/admin/formulaires/${r.id}`} className="font-medium hover:underline">
          {formatAge(r.createdAt)}
        </Link>
      ),
    },
    {
      key: 'funnel',
      label: 'Funnel',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant="secondary" className="w-fit">
            {FUNNEL_LABELS[r.funnel] ?? r.funnel}
          </Badge>
          {r.echeance ? (
            <span className="text-ink-400 text-xs">{ECHEANCE_LABELS[r.echeance] ?? r.echeance}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Téléphone',
      className: 'text-data',
      render: (r) => r.phone ?? '—',
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (r) => <span className="text-data">{r.email ?? '—'}</span>,
    },
    {
      key: 'montant',
      label: 'Hypothèque',
      className: 'text-data',
      render: (r) => {
        const f = shortLeadFigures(r.data)
        return f.montant ? formatCHF(f.montant) : '—'
      },
    },
    {
      key: 'revenu',
      label: 'Revenu',
      className: 'text-data',
      render: (r) => {
        const f = shortLeadFigures(r.data)
        return f.revenu ? formatCHF(f.revenu) : '—'
      },
    },
    {
      key: 'state',
      label: 'Finançabilité',
      render: (r) => {
        const f = shortLeadFigures(r.data)
        return <Badge variant={STATE_BADGE[f.state]}>{STATE_LABELS[f.state]}</Badge>
      },
    },
    {
      key: 'source',
      label: 'Source',
      render: (r) => r.utmSource ?? 'organique',
    },
  ]

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Leads</h1>

      {/* Synthèse : valeur totale des hypothèques demandées + volume, par jour */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                Hypothèques demandées
              </p>
              <p className="text-ink-400 text-xs">
                {totalCount} demande{totalCount > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-data text-pilot-700 mt-1 text-3xl font-semibold">
              {formatCHF(totalValue)}
            </p>
            <p className="text-ink-500 mt-3 mb-1 text-xs">Valeur demandée par jour</p>
            <MiniBarChart points={days} metric="value" showAmount />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                Demandes
              </p>
              <p className="text-ink-400 text-xs">30 derniers jours</p>
            </div>
            <p className="text-data text-pilot-700 mt-1 text-3xl font-semibold">{totalCount}</p>
            <p className="text-ink-500 mt-3 mb-1 text-xs">Nombre de demandes par jour</p>
            <MiniBarChart points={days} metric="count" color="var(--color-ink-400)" />
          </CardContent>
        </Card>
      </div>

      {/* Entonnoir de conversion : visiteurs → critères → offre → contact */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              Entonnoir de conversion
            </p>
            <p className="text-ink-400 text-xs">30 derniers jours</p>
          </div>
          <FunnelChart steps={funnelSteps} />
          <p className="text-ink-400 mt-3 text-xs leading-relaxed">
            Les abandons montrent qui quitte à chaque étape. Entre « Résultats (pop-up) » et
            « Aller plus loin » : les visiteurs qui ont vu la pop-up et l’ont quittée sans continuer.
          </p>
        </CardContent>
      </Card>

      <TableToolbar
        searchPlaceholder="Nom, email, téléphone…"
        filters={[
          {
            key: 'funnel',
            label: 'Funnel',
            options: Object.entries(FUNNEL_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: 'echeance',
            label: 'Échéance',
            options: Object.entries(ECHEANCE_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: 'source',
            label: 'Source',
            options: [
              { value: 'organique', label: 'Organique' },
              ...sources
                .map((s) => s.utmSource!)
                .filter(Boolean)
                .map((s) => ({ value: s, label: s })),
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        basePath="/admin/formulaires"
        params={params}
        emptyLabel="Aucun lead ne correspond."
      />
    </div>
  )
}
