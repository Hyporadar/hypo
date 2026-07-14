import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, TrendingUp, Users } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { isCampagneAuthed } from '@/lib/campagne'
import { prisma } from '@/lib/prisma'
import { FUNNEL_LABELS } from '@/lib/admin-labels'
import { formatCHF } from '@/lib/format'
import { deriveMontantTotal, dossierDataSchema } from '@/lib/dossier/schema'
import { campagneLogout } from '@/server/actions/campagne'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' }) // YYYY-MM-DD
}
function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}
function fmtDateTime(date: Date): string {
  return date.toLocaleString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })
}

// Mini graphique en barres (rendu serveur, sans JS ni dépendance).
function DayBars({
  days,
  color,
  format,
}: {
  days: Array<{ iso: string; value: number }>
  color: string
  format: (v: number) => string
}) {
  const max = Math.max(1, ...days.map((d) => d.value))
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {days.map((d) => (
          <div
            key={d.iso}
            className="flex flex-1 items-end"
            style={{ height: '100%' }}
            title={`${dayLabel(d.iso)} — ${format(d.value)}`}
          >
            <div
              className={cn('w-full rounded-t', color)}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="text-ink-400 mt-1 flex gap-1 text-[10px]">
        {days.map((d, i) => (
          <span key={d.iso} className="flex-1 text-center">
            {days.length <= 21 || i % Math.ceil(days.length / 14) === 0 ? dayLabel(d.iso) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export default async function CampagneLeadsPage() {
  if (!(await isCampagneAuthed())) redirect('/campagne')

  const leads = await prisma.testLead.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })

  // Agrégats : nombre de leads + valeur d'hypothèque totale, et par jour.
  const perDay = new Map<string, { count: number; montant: number }>()
  let totalMontant = 0
  for (const lead of leads) {
    const parsed = dossierDataSchema.safeParse(lead.data)
    const montant = parsed.success
      ? (deriveMontantTotal(lead.funnel as Funnel, parsed.data) ?? 0)
      : 0
    totalMontant += montant
    const key = dayKey(lead.createdAt)
    const entry = perDay.get(key) ?? { count: 0, montant: 0 }
    entry.count += 1
    entry.montant += montant
    perDay.set(key, entry)
  }

  // Plage continue du premier au dernier jour (max 60 jours), trous à 0.
  const keys = [...perDay.keys()].sort()
  const days: Array<{ iso: string; count: number; montant: number }> = []
  if (keys.length > 0) {
    const start = new Date(`${keys[0]}T12:00:00`)
    const end = new Date(`${keys[keys.length - 1]}T12:00:00`)
    const cursor = new Date(Math.max(start.getTime(), end.getTime() - 59 * 86_400_000))
    while (cursor <= end) {
      const iso = cursor.toLocaleDateString('en-CA')
      const e = perDay.get(iso) ?? { count: 0, montant: 0 }
      days.push({ iso, count: e.count, montant: e.montant })
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Leads de campagne</h1>
        <form action={campagneLogout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut data-icon="inline-start" />
            Déconnexion
          </Button>
        </form>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="border-line rounded-xl border bg-white p-5">
          <p className="text-ink-500 flex items-center gap-2 text-sm">
            <Users className="text-pilot-600 size-4" /> Nombre de leads
          </p>
          <p className="text-data mt-1 text-3xl">{leads.length}</p>
        </div>
        <div className="border-line rounded-xl border bg-white p-5">
          <p className="text-ink-500 flex items-center gap-2 text-sm">
            <TrendingUp className="text-pilot-600 size-4" /> Valeur d&apos;hypothèque totale
          </p>
          <p className="text-data mt-1 text-3xl">{formatCHF(totalMontant)}</p>
        </div>
      </div>

      {/* Graphiques jour par jour */}
      {days.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="border-line rounded-xl border bg-white p-5">
            <p className="font-display mb-4 text-sm font-semibold">Leads par jour</p>
            <DayBars
              days={days.map((d) => ({ iso: d.iso, value: d.count }))}
              color="bg-pilot-600"
              format={(v) => `${v} lead${v > 1 ? 's' : ''}`}
            />
          </div>
          <div className="border-line rounded-xl border bg-white p-5">
            <p className="font-display mb-4 text-sm font-semibold">
              Valeur d&apos;hypothèque par jour
            </p>
            <DayBars
              days={days.map((d) => ({ iso: d.iso, value: d.montant }))}
              color="bg-ambre-500"
              format={(v) => formatCHF(v)}
            />
          </div>
        </div>
      ) : null}

      {/* Détail des leads */}
      <div className="border-line mt-4 overflow-x-auto rounded-xl border bg-white">
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
                <tr
                  key={lead.id}
                  className="border-line hover:bg-surface-alt border-b last:border-0"
                >
                  <td className="text-data px-4 py-3 whitespace-nowrap">
                    <Link href={`/campagne/leads/${lead.id}`} className="hover:underline">
                      {fmtDateTime(lead.createdAt)}
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
