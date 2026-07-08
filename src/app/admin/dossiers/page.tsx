import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { FUNNEL_LABELS, STATUT_LABELS, formatAge } from '@/lib/admin-labels'
import { prisma } from '@/lib/prisma'
import { PAGE_SIZE, parseTableParams } from '@/lib/table'
import { requireRole } from '@/server/admin/guard'
import { DataTable, type ColumnDef } from '@/components/admin/data-table'
import { TableToolbar } from '@/components/admin/table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

type DossierRow = Prisma.DossierGetPayload<{
  include: {
    lead: {
      select: {
        name: true
        email: true
        status: true
        closer: { select: { id: true; name: true } }
      }
    }
  }
}>

const SORT_MAP: Record<string, Prisma.DossierOrderByWithRelationInput> = {
  echeance: { echeanceProche: 'asc' },
  completude: { completude: 'desc' },
  activite: { lastActivityAt: 'desc' },
  creation: { createdAt: 'desc' },
}

function joursRestants(echeance: Date | null): string {
  if (!echeance) return '—'
  const days = Math.ceil((echeance.getTime() - Date.now()) / 86_400_000)
  return days < 0 ? 'échue' : `J−${days}`
}

// Liste des dossiers structurés — tri par échéance la plus proche (défaut).
// ADMIN : tout ; CLOSER : uniquement les dossiers dont le lead lui est assigné.
export default async function AdminDossiersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireRole('ADMIN', 'CLOSER')
  const params = parseTableParams(await searchParams, 'echeance')

  const where: Prisma.DossierWhereInput = {
    ...(session.user.role === 'CLOSER' ? { lead: { closerId: session.user.id } } : {}),
    ...(params.q
      ? {
          OR: [
            { id: { contains: params.q } },
            { lead: { name: { contains: params.q, mode: 'insensitive' } } },
            { lead: { email: { contains: params.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(params.filters.funnel ? { funnel: params.filters.funnel as never } : {}),
    ...(params.filters.complexite === 'complexe'
      ? { complex: true }
      : params.filters.complexite === 'standard'
        ? { complex: false }
        : {}),
    ...(params.filters.completude === 'complet'
      ? { completude: 100 }
      : params.filters.completude === 'avance'
        ? { completude: { gte: 50, lt: 100 } }
        : params.filters.completude === 'debut'
          ? { completude: { lt: 50 } }
          : {}),
  }

  const sortKey = SORT_MAP[params.sort] ? params.sort : 'echeance'
  const orderBy = SORT_MAP[sortKey]!

  const [rows, total] = await Promise.all([
    prisma.dossier.findMany({
      where,
      orderBy: [orderBy, { createdAt: 'desc' }],
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        lead: {
          select: {
            name: true,
            email: true,
            status: true,
            closer: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.dossier.count({ where }),
  ])

  const columns: Array<ColumnDef<DossierRow>> = [
    {
      key: 'client',
      label: 'Client',
      render: (d) => (
        <Link href={`/admin/dossiers/${d.id}`} className="font-medium hover:underline">
          {d.lead?.name ?? d.lead?.email ?? `Anonyme · ${d.id.slice(0, 8)}`}
        </Link>
      ),
    },
    {
      key: 'funnel',
      label: 'Funnel',
      render: (d) => <Badge variant="secondary">{FUNNEL_LABELS[d.funnel]}</Badge>,
    },
    {
      key: 'statut',
      label: 'Statut lead',
      render: (d) => (d.lead ? (STATUT_LABELS[d.lead.status] ?? d.lead.status) : 'Sans lead'),
    },
    {
      key: 'echeance',
      label: 'Échéance',
      sortable: true,
      className: 'text-data',
      render: (d) =>
        d.echeanceProche ? (
          <span className="flex items-center gap-2">
            {d.echeanceProche.toLocaleDateString('fr-CH')}
            <Badge variant={d.echeanceProche.getTime() - Date.now() < 120 * 86_400_000 ? 'destructive' : 'outline'}>
              {joursRestants(d.echeanceProche)}
            </Badge>
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'completude',
      label: 'Complétude',
      sortable: true,
      render: (d) => (
        <span className="flex items-center gap-2">
          <Progress value={d.completude} className="w-20" />
          <span className="text-data text-xs">{d.completude}%</span>
        </span>
      ),
    },
    {
      key: 'complex',
      label: 'Cas',
      render: (d) =>
        d.complex ? <Badge className="bg-ambre-100 text-ambre-700">Complexe</Badge> : 'Standard',
    },
    {
      key: 'closer',
      label: 'Closer',
      render: (d) => d.lead?.closer?.name ?? '—',
    },
    {
      key: 'activite',
      label: 'Dernière activité',
      sortable: true,
      className: 'text-data',
      render: (d) => formatAge(d.lastActivityAt),
    },
  ]

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Dossiers</h1>
      <TableToolbar
        searchPlaceholder="Nom, email, identifiant…"
        filters={[
          {
            key: 'funnel',
            label: 'Funnel',
            options: Object.entries(FUNNEL_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: 'completude',
            label: 'Complétude',
            options: [
              { value: 'complet', label: 'Complet (100%)' },
              { value: 'avance', label: 'Avancé (50–99%)' },
              { value: 'debut', label: 'Débuté (<50%)' },
            ],
          },
          {
            key: 'complexite',
            label: 'Cas',
            options: [
              { value: 'complexe', label: 'Complexe' },
              { value: 'standard', label: 'Standard' },
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        basePath="/admin/dossiers"
        params={params}
        emptyLabel="Aucun dossier ne correspond."
      />
    </div>
  )
}
