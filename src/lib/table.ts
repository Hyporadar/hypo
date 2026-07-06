// Paramètres des tableaux serveur (tri, recherche, filtres, pagination)
// portés par l'URL — partagés par toutes les vues du panel.

export interface TableParams {
  page: number
  q: string
  sort: string
  dir: 'asc' | 'desc'
  filters: Record<string, string>
}

export const PAGE_SIZE = 25

const RESERVED = new Set(['page', 'q', 'sort', 'dir'])

export function parseTableParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaultSort: string
): TableParams {
  const get = (k: string) => {
    const v = searchParams[k]
    return typeof v === 'string' ? v : undefined
  }
  const filters: Record<string, string> = {}
  for (const [k, v] of Object.entries(searchParams)) {
    if (!RESERVED.has(k) && typeof v === 'string' && v) filters[k] = v
  }
  return {
    page: Math.max(1, Number(get('page')) || 1),
    q: get('q') ?? '',
    sort: get('sort') ?? defaultSort,
    dir: get('dir') === 'asc' ? 'asc' : 'desc',
    filters,
  }
}

export function tableHref(
  basePath: string,
  params: TableParams,
  overrides: Partial<TableParams> & { filters?: Record<string, string> }
): string {
  const merged = {
    ...params,
    ...overrides,
    filters: { ...params.filters, ...(overrides.filters ?? {}) },
  }
  const search = new URLSearchParams()
  if (merged.page > 1) search.set('page', String(merged.page))
  if (merged.q) search.set('q', merged.q)
  search.set('sort', merged.sort)
  search.set('dir', merged.dir)
  for (const [k, v] of Object.entries(merged.filters)) {
    if (v) search.set(k, v)
  }
  const qs = search.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
