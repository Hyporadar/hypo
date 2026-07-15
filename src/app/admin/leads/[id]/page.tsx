import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { formatAge, FUNNEL_LABELS, SIGNAL_LABELS, STATUT_LABELS } from '@/lib/admin-labels'
import { computeRenewalSavings, monthsUntil } from '@/lib/finance'
import { formatCHF, formatDate, formatRate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { getReferenceRate10y } from '@/lib/rates'
import { requireRole } from '@/server/admin/guard'
import {
  LeadStatusSelect,
  NotesEditor,
  ScheduleDialog,
  TreatSignalButton,
} from '@/components/admin/lead-actions'
import { SignalChrono } from '@/components/admin/signal-chrono'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Scripts contextuels par type de signal — placeholders structurés,
// les vrais scripts seront fournis par le métier.
const SCRIPTS: Record<string, { hook: string; points: string[]; close: string }> = {
  CALLBACK_DEMANDE: {
    hook: '« Bonjour, vous avez demandé à être rappelé par HypoRadar — je vous appelle à ce sujet. »',
    points: [
      'Confirmer le contexte : renouvellement ou achat ?',
      'Poser la question de l’échéance en premier.',
      '[SCRIPT MÉTIER À INSÉRER — qualification]',
    ],
    close: 'Verrouiller la prochaine étape : dossier ou RDV planifié avant de raccrocher.',
  },
  ABANDON_DOSSIER: {
    hook: '« Vous aviez commencé une simulation chez nous — je vous appelle pour vous faire gagner du temps, pas pour vous vendre quoi que ce soit. »',
    points: [
      'Demander ce qui a bloqué (question, méfiance, temps ?).',
      'Finir la simulation AVEC lui au téléphone — 2 minutes.',
      '[SCRIPT MÉTIER À INSÉRER — objections]',
    ],
    close: 'Donner le résultat à l’oral puis envoyer le lien du livrable.',
  },
  OFFRES_NON_LUES: {
    hook: '« Vos offres de financement sont prêtes depuis quelques jours — je voulais m’assurer que vous les avez bien reçues. »',
    points: [
      'Guider vers l’espace client pendant l’appel.',
      'Souligner la validité limitée de la meilleure offre.',
      '[SCRIPT MÉTIER À INSÉRER — comparaison]',
    ],
    close: 'Fixer une date de décision commune.',
  },
  OFFRE_EXPIRE_BIENTOT: {
    hook: '« Votre meilleure offre expire dans quelques jours — après, il faudra tout renégocier. »',
    points: [
      'Rappeler le taux et l’économie en francs.',
      'Identifier le vrai blocage (co-décideur ? banque actuelle ?).',
      '[SCRIPT MÉTIER À INSÉRER — urgence honnête]',
    ],
    close: 'Décision ou prolongation demandée au prêteur — jamais de silence.',
  },
  ENTREE_FENETRE: {
    hook: '« Votre hypothèque entre dans sa fenêtre de renouvellement — c’est le moment que nous surveillions pour vous. »',
    points: [
      'Rappeler son taux actuel vs le marché (chiffres sous les yeux).',
      'Expliquer le calendrier : préavis, offres, signature.',
      '[SCRIPT MÉTIER À INSÉRER — lancement appel d’offres]',
    ],
    close: 'Obtenir l’accord pour lancer l’appel d’offres.',
  },
  GROSSE_ECONOMIE: {
    hook: '« D’après votre simulation, vous laissez plusieurs milliers de francs par an sur la table — je vous appelle pour vérifier ces chiffres avec vous. »',
    points: [
      'Valider montant/taux/échéance déclarés.',
      'Annoncer l’économie annuelle en francs, pas en pourcent.',
      '[SCRIPT MÉTIER À INSÉRER — projection sur 10 ans]',
    ],
    close: 'Transformer l’économie en décision : lancer le dossier.',
  },
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('ADMIN', 'CLOSER')
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      mortgage: true,
      purchaseProject: true,
      certificate: true,
      closer: { select: { id: true, name: true } },
      partner: { select: { name: true } },
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        include: { changedBy: { select: { name: true } } },
      },
      signals: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      offers: { orderBy: { rate: 'asc' } },
      appointments: { orderBy: { date: 'asc' } },
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!lead) notFound()

  // Étanchéité closer : uniquement ses leads assignés.
  if (session.user.role === 'CLOSER' && lead.closerId !== session.user.id) {
    redirect('/admin')
  }

  const refRate = await getReferenceRate10y()
  const savings = lead.mortgage
    ? computeRenewalSavings({
        remainingAmount: Number(lead.mortgage.remainingAmount),
        currentRate: Number(lead.mortgage.currentRate),
        referenceRate: refRate,
      })
    : null
  const monthsToEnd = lead.mortgage ? monthsUntil(lead.mortgage.endDate, new Date()) : null
  const openSignals = lead.signals.filter((s) => s.status === 'OUVERT')

  // Timeline unifiée (statuts + signaux + événements clients + documents)
  const timeline = [
    ...lead.statusHistory.map((h) => ({
      at: h.changedAt,
      label: `Statut → ${STATUT_LABELS[h.toStatus]}${h.changedBy ? ` (${h.changedBy.name})` : ' (auto)'}`,
    })),
    ...lead.signals.map((s) => ({
      at: s.createdAt,
      label: `Signal : ${SIGNAL_LABELS[s.type]}${s.status === 'TRAITE' ? ' — traité' : ''}`,
    })),
    ...lead.events.map((e) => ({ at: e.createdAt, label: `Client : ${e.type}` })),
    ...lead.documents.map((d) => ({ at: d.createdAt, label: `Document reçu : ${d.type}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-ink-500 hover:text-ink-900">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-semibold">{lead.name ?? lead.email ?? 'Lead'}</h1>
        <Badge variant="secondary">{FUNNEL_LABELS[lead.funnel]}</Badge>
        <span className="text-data text-ink-400 text-xs uppercase">{lead.locale}</span>
        <div className="ml-auto flex items-center gap-2">
          <ScheduleDialog leadId={lead.id} leadName={lead.name ?? ''} />
          <LeadStatusSelect leadId={lead.id} status={lead.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* L'économie en gros — tout à l'écran pendant l'appel */}
          {lead.mortgage ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                      Économie potentielle
                    </p>
                    <p
                      className={`text-data mt-1 text-5xl ${savings && savings > 0 ? 'text-ambre-700' : 'text-pilot-700'}`}
                    >
                      {savings !== null ? `${formatCHF(Math.round(Math.max(0, savings)))}/an` : '—'}
                    </p>
                  </div>
                  <dl className="text-data grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <dt className="text-ink-500 font-sans">Taux client</dt>
                    <dd>{formatRate(Number(lead.mortgage.currentRate))}</dd>
                    <dt className="text-ink-500 font-sans">Marché 10 ans</dt>
                    <dd className="text-pilot-700">{formatRate(refRate)}</dd>
                    <dt className="text-ink-500 font-sans">Solde</dt>
                    <dd>{formatCHF(Number(lead.mortgage.remainingAmount))}</dd>
                    <dt className="text-ink-500 font-sans">Prêteur</dt>
                    <dd className="font-sans">{lead.mortgage.currentLender}</dd>
                    <dt className="text-ink-500 font-sans">Échéance</dt>
                    <dd>
                      {formatDate(lead.mortgage.endDate)} ({monthsToEnd} mois)
                    </dd>
                    <dt className="text-ink-500 font-sans">Préavis restant</dt>
                    <dd>{monthsToEnd !== null ? `~${Math.max(0, monthsToEnd - 4)} mois` : '—'}</dd>
                  </dl>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {lead.purchaseProject ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Projet d’achat</CardTitle>
              </CardHeader>
              <CardContent className="text-data grid grid-cols-2 gap-x-8 gap-y-1 px-6 pb-6 text-sm sm:grid-cols-4">
                <span className="text-ink-500 font-sans">Prix</span>
                <span>{formatCHF(Number(lead.purchaseProject.price))}</span>
                <span className="text-ink-500 font-sans">Revenu</span>
                <span>{formatCHF(Number(lead.purchaseProject.annualGrossIncome))}</span>
                <span className="text-ink-500 font-sans">Fonds propres</span>
                <span>{formatCHF(Number(lead.purchaseProject.ownFunds))}</span>
                <span className="text-ink-500 font-sans">dont 2e pilier</span>
                <span>{formatCHF(Number(lead.purchaseProject.ownFundsPillar2))}</span>
              </CardContent>
            </Card>
          ) : null}

          {/* Panneau script contextuel selon le signal ouvert */}
          {openSignals.map((signal) => {
            const script = SCRIPTS[signal.type]!
            return (
              <Card key={signal.id} className="border-pilot-200">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-display text-base">
                      Script — {SIGNAL_LABELS[signal.type]}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <SignalChrono createdAt={signal.createdAt.toISOString()} />
                      <TreatSignalButton signalId={signal.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-6 pb-6 text-sm">
                  <p className="text-ink-900 font-medium">{script.hook}</p>
                  <ul className="text-ink-700 list-disc space-y-1 pl-5">
                    {script.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <p className="border-pilot-600 text-ink-900 border-l-2 pl-3 font-medium">
                    {script.close}
                  </p>
                </CardContent>
              </Card>
            )
          })}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <NotesEditor leadId={lead.id} initial={lead.notes ?? ''} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Coordonnées + contexte */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-6 pb-6 text-sm">
              <p className="text-data">{lead.email ?? '—'}</p>
              <p className="text-data">{lead.phone ?? '—'}</p>
              <p className="text-ink-500 pt-2 text-xs">
                Source :{' '}
                {lead.partner
                  ? `Partenaire · ${lead.partner.name}`
                  : (lead.utmSource ?? 'organique')}
                {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ''}
              </p>
              <p className="text-ink-500 text-xs">Créé il y a {formatAge(lead.createdAt)}</p>
              <p className="text-ink-500 text-xs">Score : {lead.score}</p>
            </CardContent>
          </Card>

          {/* Offres */}
          {lead.offers.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Offres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-6 pb-6 text-sm">
                {lead.offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="border-line flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <span>{offer.lender}</span>
                    <span className="text-data">{formatRate(Number(offer.rate))}</span>
                    <Badge variant="secondary">{offer.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Historique</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <ul className="space-y-2.5 text-sm">
                {timeline.slice(0, 25).map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-data text-ink-400 shrink-0 text-xs">
                      {formatDate(item.at)}
                    </span>
                    <span className="text-ink-700">{item.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
