import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { RatesEditor } from '@/components/admin/rates-editor'

export default async function AdminRatesPage() {
  await requireRole('ADMIN')

  const [rates, lastChanges] = await Promise.all([
    prisma.referenceRate.findMany({ orderBy: [{ type: 'desc' }, { termYears: 'asc' }] }),
    prisma.referenceRateChange.findMany({ orderBy: { recordedAt: 'desc' }, take: 10 }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Taux de référence</h1>
        <p className="text-ink-500 mt-1 text-sm">
          Nationaux, alimentent tous les calculs publics (fourchettes, économies, page /taux).
          Chaque modification est historisée.
        </p>
      </div>
      <RatesEditor
        rates={rates.map((r) => ({
          type: r.type,
          termYears: r.termYears,
          rate: Number(r.rate),
        }))}
      />
      {lastChanges.length > 0 ? (
        <div className="text-ink-500 text-xs">
          <p className="mb-2 font-semibold tracking-[0.08em] uppercase">Dernières modifications</p>
          <ul className="space-y-1">
            {lastChanges.map((c) => (
              <li key={c.id} className="text-data">
                {formatDate(c.recordedAt)} —{' '}
                {c.type === 'SARON' ? 'SARON' : `Fixe ${c.termYears} ans`} →{' '}
                {String(Number(c.rate)).replace('.', ',')}%
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
