import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { formatAge, FUNNEL_LABELS, STATUT_LABELS } from '@/lib/admin-labels'
import { prisma } from '@/lib/prisma'
import { PAGE_SIZE, parseTableParams } from '@/lib/table'
import { requireRole } from '@/server/admin/guard'
import { DataTable, type ColumnDef } from '@/components/admin/data-table'
import { AssignCloserSelect, LeadStatusSelect } from '@/components/admin/lead-actions'
import { TableToolbar } from '@/components/admin/table-toolbar'
import { Badge } from '@/components/ui/badge'

type LeadRow = Prisma.LeadGetPayload<{
  include: {
    closer: { select: { id: true; name: true } }
    partner: { select: { name: true } }
    statusHistory: { select: { toStatus: true; changedAt: true } }
  }
}>

const SORT_MAP: Record<string, Prisma.LeadOrderByWithRelationInput> = {
  createdAt: { createdAt: 'desc' },
  score: { score: 'desc' },
  name: { name: 'asc' },
  status: { status: 'asc' },
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRole('ADMIN')
  const params = parseTableParams(await searchParams, 'createdAt')

  const where: Prisma.LeadWhereInput = {
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { email: { contains: params.q, mode: 'insensitive' } },
            { phone: { contains: params.q } },
          ],
        }
      : {}),
    ...(params.filters.funnel ? { funnel: params.filters.funnel as never } : {}),
    ...(params.filters.statut ? { status: params.filters.statut as never } : {}),
    ...(params.filters.langue ? { locale: params.filters.langue as never } : {}),
    ...(params.filters.closer ? { closerId: params.filters.closer } : {}),
    ...(params.filters.source === 'partenaire'
      ? { partnerId: { not: null } }
      : params.filters.source === 'organique'
        ? { utmSource: null, partnerId: null }
        : params.filters.source
          ? { utmSource: params.filters.source }
          : {}),
  }

  const sortKey = SORT_MAP[params.sort] ? params.sort : 'createdAt'
  const orderBy = {
    [Object.keys(SORT_MAP[sortKey]!)[0]!]: params.dir,
  } as Prisma.LeadOrderByWithRelationInput

  const [rows, total, closers, sources] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        closer: { select: { id: true, name: true } },
        partner: { select: { name: true } },
        statusHistory: {
          where: { toStatus: 'CONTACTE' },
          orderBy: { changedAt: 'asc' },
          take: 1,
          select: { toStatus: true, changedAt: true },
        },
      },
    }),
    prisma.lead.count({ where }),
    prisma.user.findMany({ where: { role: 'CLOSER' }, select: { id: true, name: true } }),
    prisma.lead.groupBy({ by: ['utmSource'], where: { utmSource: { not: null } } }),
  ])

  const columns: Array<ColumnDef<LeadRow>> = [
    {
      key: 'name',
      label: 'Nom',
      sortable: true,
      render: (lead) => (
        <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:underline">
          {lead.name ?? lead.email ?? '—'}
        </Link>
      ),
    },
    {
      key: 'funnel',
      label: 'Funnel',
      render: (lead) => <Badge variant="secondary">{FUNNEL_LABELS[lead.funnel]}</Badge>,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (lead) => <LeadStatusSelect leadId={lead.id} status={lead.status} compact />,
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      className: 'text-data',
      render: (lead) => String(lead.score),
    },
    {
      key: 'locale',
      label: 'Langue',
      render: (lead) => <span className="text-data uppercase">{lead.locale}</span>,
    },
    {
      key: 'source',
      label: 'Source',
      render: (lead) =>
        lead.partner ? `Partenaire · ${lead.partner.name}` : (lead.utmSource ?? 'organique'),
    },
    {
      key: 'closer',
      label: 'Closer',
      render: (lead) => (
        <AssignCloserSelect leadId={lead.id} closerId={lead.closer?.id ?? null} closers={closers} />
      ),
    },
    {
      key: 'createdAt',
      label: 'Âge',
      sortable: true,
      className: 'text-data',
      render: (lead) => formatAge(lead.createdAt),
    },
    {
      key: 'firstResponse',
      label: '1re réponse',
      className: 'text-data',
      render: (lead) => {
        const first = lead.statusHistory[0]
        return first ? formatAge(lead.createdAt, first.changedAt) : '—'
      },
    },
  ]

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Leads</h1>
      <TableToolbar
        searchPlaceholder="Nom, email, téléphone…"
        filters={[
          {
            key: 'funnel',
            label: 'Funnel',
            options: Object.entries(FUNNEL_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: 'statut',
            label: 'Statut',
            options: Object.entries(STATUT_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: 'langue',
            label: 'Langue',
            options: [
              { value: 'fr', label: 'FR' },
              { value: 'de', label: 'DE' },
              { value: 'it', label: 'IT' },
            ],
          },
          {
            key: 'source',
            label: 'Source',
            options: [
              { value: 'organique', label: 'Organique' },
              { value: 'partenaire', label: 'Partenaire' },
              ...sources
                .map((s) => s.utmSource!)
                .filter(Boolean)
                .map((s) => ({ value: s, label: s })),
            ],
          },
          {
            key: 'closer',
            label: 'Closer',
            options: closers.map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        basePath="/admin/leads"
        params={params}
        emptyLabel="Aucun lead ne correspond."
      />
    </div>
  )
}
