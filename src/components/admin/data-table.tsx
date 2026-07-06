import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE, tableHref, type TableParams } from '@/lib/table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Tableau serveur réutilisable : tri par en-tête, pagination par liens.
// La recherche et les filtres vivent dans <TableToolbar> (client).

export interface ColumnDef<T> {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  total,
  basePath,
  params,
  emptyLabel = 'Aucun résultat',
}: {
  columns: Array<ColumnDef<T>>
  rows: T[]
  total: number
  basePath: string
  params: TableParams
  emptyLabel?: string
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-3">
      <div className="border-line overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortable ? (
                    <Link
                      href={tableHref(basePath, params, {
                        sort: col.key,
                        dir: params.sort === col.key && params.dir === 'desc' ? 'asc' : 'desc',
                        page: 1,
                      })}
                      className="hover:text-ink-900 inline-flex items-center gap-1"
                    >
                      {col.label}
                      {params.sort === col.key ? (
                        params.dir === 'asc' ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </Link>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-ink-500 py-10 text-center">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 ? (
        <div className="text-ink-500 flex items-center justify-between text-sm">
          <span className="text-data">
            {total} · page {params.page}/{pages}
          </span>
          <div className="flex gap-2">
            {params.page > 1 ? (
              <Link
                href={tableHref(basePath, params, { page: params.page - 1 })}
                className="border-line hover:bg-surface-alt inline-flex items-center gap-1 rounded-full border px-3 py-1"
              >
                <ChevronLeft className="size-3.5" /> Précédent
              </Link>
            ) : null}
            {params.page < pages ? (
              <Link
                href={tableHref(basePath, params, { page: params.page + 1 })}
                className="border-line hover:bg-surface-alt inline-flex items-center gap-1 rounded-full border px-3 py-1"
              >
                Suivant <ChevronRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
