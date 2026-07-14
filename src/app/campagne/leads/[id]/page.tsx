import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { isCampagneAuthed } from '@/lib/campagne'
import { prisma } from '@/lib/prisma'
import { FUNNEL_LABELS } from '@/lib/admin-labels'
import { flattenDossier, humanLabel } from '@/lib/dossier/diff'
import { Badge } from '@/components/ui/badge'

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  return String(value)
}

function fmt(date: Date): string {
  return date.toLocaleString('fr-CH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Zurich' })
}

export default async function CampagneLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isCampagneAuthed())) redirect('/campagne')
  const { id } = await params
  const lead = await prisma.testLead.findUnique({ where: { id } })
  if (!lead) notFound()

  // Champs du formulaire remplis (aplatis, libellés humains).
  const flat = flattenDossier(lead.data)
  const fields = Object.entries(flat).filter(
    ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  )

  const meta: Array<[string, string]> = [
    ['Email', lead.email ?? '—'],
    ['Téléphone', lead.phone ?? '—'],
    [
      'Rappel souhaité',
      lead.callbackDate ? `${lead.callbackDate} · ${lead.callbackSlot ?? ''}`.trim() : '—',
    ],
    ['Source', lead.utmSource ?? '—'],
    ['Campagne', lead.utmCampaign ?? '—'],
    ['Medium', lead.utmMedium ?? '—'],
    ['Referrer', lead.referrer ?? '—'],
  ]

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/campagne/leads"
        className="text-ink-500 hover:text-ink-900 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Tous les leads
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-semibold">Lead du {fmt(lead.createdAt)}</h1>
        <Badge variant="secondary">{FUNNEL_LABELS[lead.funnel] ?? lead.funnel}</Badge>
        <Badge variant="outline">{lead.completude}% complété</Badge>
      </div>

      {/* Contact + attribution */}
      <section className="border-line mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-display mb-2 font-semibold">Contact &amp; source</h2>
        <dl className="divide-line divide-y">
          {meta.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className="text-ink-500">{label}</dt>
              <dd className="text-data text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Détail du formulaire rempli */}
      <section className="border-line mt-4 rounded-xl border bg-white p-5">
        <h2 className="font-display mb-2 font-semibold">Formulaire</h2>
        {fields.length === 0 ? (
          <p className="text-ink-500 text-sm">Aucun champ rempli.</p>
        ) : (
          <dl className="divide-line divide-y">
            {fields.map(([path, value]) => (
              <div key={path} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                <dt className="text-ink-500">{humanLabel(path)}</dt>
                <dd className="text-data max-w-[60%] text-right break-words">{display(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
