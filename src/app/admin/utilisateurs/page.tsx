import type { Prisma } from '@prisma/client'
import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { PAGE_SIZE, parseTableParams } from '@/lib/table'
import { requireRole } from '@/server/admin/guard'
import { DataTable, type ColumnDef } from '@/components/admin/data-table'
import { TableToolbar } from '@/components/admin/table-toolbar'
import { RoleSelect } from '@/components/admin/user-actions'

type UserRow = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    role: true
    locale: true
    partnerCode: true
    createdAt: true
  }
}>

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireRole('ADMIN')
  const params = parseTableParams(await searchParams, 'createdAt')

  const where: Prisma.UserWhereInput = {
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { email: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(params.filters.role ? { role: params.filters.role as never } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [params.sort === 'name' ? 'name' : 'createdAt']: params.dir },
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locale: true,
        partnerCode: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  const columns: Array<ColumnDef<UserRow>> = [
    {
      key: 'name',
      label: 'Nom',
      sortable: true,
      render: (u) => <span className="font-medium">{u.name}</span>,
    },
    { key: 'email', label: 'Email', className: 'text-data', render: (u) => u.email },
    {
      key: 'role',
      label: 'Rôle',
      render: (u) => <RoleSelect userId={u.id} role={u.role} disabled={u.id === session.user.id} />,
    },
    { key: 'locale', label: 'Langue', className: 'text-data uppercase', render: (u) => u.locale },
    { key: 'code', label: 'Code', className: 'text-data', render: (u) => u.partnerCode ?? '—' },
    {
      key: 'createdAt',
      label: 'Créé le',
      sortable: true,
      className: 'text-data',
      render: (u) => formatDate(u.createdAt),
    },
  ]

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Utilisateurs</h1>
      <TableToolbar
        searchPlaceholder="Nom ou email…"
        filters={[
          {
            key: 'role',
            label: 'Rôle',
            options: ['CLIENT', 'CLOSER', 'PARTNER', 'ADMIN'].map((r) => ({ value: r, label: r })),
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        basePath="/admin/utilisateurs"
        params={params}
      />
    </div>
  )
}
