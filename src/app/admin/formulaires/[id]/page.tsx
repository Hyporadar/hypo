import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { formatAge, FUNNEL_LABELS } from '@/lib/admin-labels'
import { formatCHF, formatDate, formatRate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import {
  ECHEANCE_LABELS,
  shortLeadFigures,
  SLOT_LABELS,
  STATE_BADGE,
  STATE_LABELS,
} from '@/lib/admin/short-lead'
import { requireRole } from '@/server/admin/guard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-ink-500 text-sm">{label}</span>
      <span className="text-data text-sm">{value}</span>
    </div>
  )
}

// Détail d'un lead du formulaire court (TestLead).
export default async function FormLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('ADMIN')
  const { id } = await params

  const lead = await prisma.testLead.findUnique({ where: { id } })
  if (!lead) notFound()

  const f = shortLeadFigures(lead.data)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/formulaires" className="text-ink-500 hover:text-ink-900">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-semibold">{lead.name ?? lead.email ?? 'Lead'}</h1>
        <Badge variant="secondary">{FUNNEL_LABELS[lead.funnel] ?? lead.funnel}</Badge>
        <Badge variant={STATE_BADGE[f.state]}>{STATE_LABELS[f.state]}</Badge>
        <span className="text-ink-500 ml-auto text-xs">Reçu il y a {formatAge(lead.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Chiffres du dossier + finançabilité */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Le dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-6 pb-6">
              <Row label="Valeur du bien" value={f.valeur ? formatCHF(f.valeur) : '—'} />
              <Row label="Hypothèque" value={f.montant ? formatCHF(f.montant) : '—'} />
              <Row label="Revenu du ménage" value={f.revenu ? formatCHF(f.revenu) : '—'} />
              <div className="border-line my-1 border-t" />
              <Row label="LTV" value={f.state === 'incomplete' ? '—' : formatRate(f.ltv * 100)} />
              <Row
                label="Tenue des charges"
                value={f.state === 'incomplete' ? '—' : formatRate(f.charges * 100)}
              />
              <Row
                label="Finançabilité"
                value={<Badge variant={STATE_BADGE[f.state]}>{STATE_LABELS[f.state]}</Badge>}
              />
            </CardContent>
          </Card>

          {/* Rappel souhaité / message */}
          {lead.callbackDate || lead.callbackSlot || lead.message ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Rappel &amp; message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-6 pb-6">
                {lead.callbackDate ? <Row label="Date souhaitée" value={lead.callbackDate} /> : null}
                {lead.callbackSlot ? (
                  <Row label="Créneau" value={SLOT_LABELS[lead.callbackSlot] ?? lead.callbackSlot} />
                ) : null}
                {lead.message ? (
                  <p className="text-ink-700 border-line mt-2 border-t pt-3 text-sm whitespace-pre-wrap">
                    {lead.message}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-6 pb-6 text-sm">
              <p className="text-data">{lead.email ?? '— (email non renseigné)'}</p>
              <p className="text-data">{lead.phone ?? '— (téléphone non renseigné)'}</p>
              {lead.echeance ? (
                <p className="text-ink-500 pt-2 text-xs">
                  Échéance : {ECHEANCE_LABELS[lead.echeance] ?? lead.echeance}
                </p>
              ) : null}
              <p className="text-ink-500 pt-1 text-xs">
                Source : {lead.utmSource ?? 'organique'}
                {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ''}
              </p>
              <p className="text-ink-500 text-xs">Reçu le {formatDate(lead.createdAt)}</p>
              <p className="text-ink-500 text-xs">Complétude : {lead.completude}%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
