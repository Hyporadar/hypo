import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BadgePercent,
  Building2,
  CalendarClock,
  Landmark,
  Mail,
  Phone,
  UsersRound,
} from 'lucide-react'
import fr from '../../../../../messages/fr.json'
import { prisma } from '@/lib/prisma'
import { formatCHF, formatRate } from '@/lib/format'
import { CHARGE_MAX, annualCosts } from '@/lib/finance'
import { FUNNEL_LABELS, STATUT_LABELS, formatAge } from '@/lib/admin-labels'
import {
  dossierDataSchema,
  deriveMontantTotal,
  totalRevenus,
  type DossierData,
} from '@/lib/dossier/schema'
import { computeCompleteness } from '@/lib/dossier/completeness'
import { calibrateOffers } from '@/lib/dossier/calibration'
import { diffVersions } from '@/lib/dossier/diff'
import { optionLabel, questionLabel } from '@/lib/dossier/labels'
import { loadRefRates } from '@/server/dossier/rates'
import { canViewDossier, recordConsultation, stripFinancials } from '@/server/dossier/versioning'
import { requireRole } from '@/server/admin/guard'
import { VersionsBar, type VersionSummary } from '@/components/admin/dossier/versions-bar'
import { EditPanel } from '@/components/admin/dossier/edit-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const EVENT_LABELS: Record<string, string> = {
  WIZARD_STEP_COMPLETED: 'Étape du wizard complétée',
  WIZARD_ABANDONED: 'Wizard abandonné',
  COMPLEX_CASE_DETECTED: 'Cas complexe détecté',
  RATE_ALERT_SUBSCRIBED: 'Abonnement aux taux',
  OFFERS_VIEWED: 'Offres consultées',
  ACCOUNT_CREATED: 'Compte créé',
  VERSION_CREATED: 'Version enregistrée',
  CONSULTATION: 'Consultation',
}

const COMPLEX_LABELS: Record<string, string> = {
  'droit-habitation': "Droit d'habitation",
  usufruit: 'Usufruit',
  'droit-superficie': 'Droit de superficie',
  'zone-agricole': 'Zone agricole',
  servitudes: 'Servitudes',
  'nouvelle-construction': 'Nouvelle construction',
  'poursuite-non-soldee': 'Poursuite non soldée',
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })
}
function fmtDateTime(date: Date): string {
  return `${fmtDate(date)} ${date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}`
}
function isoFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

function Row({ label, value, data = false }: { label: string; value: React.ReactNode; data?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="text-ink-500 shrink-0">{label}</dt>
      <dd className={cn('text-right', data && 'text-data')}>{value}</dd>
    </div>
  )
}

// ─── Vue dossier admin : 4 colonnes + versionnage immuable ─────────────
export default async function AdminDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ v?: string; compare?: string; edit?: string }>
}) {
  const session = await requireRole('ADMIN', 'CLOSER', 'PARTNER')
  const { id } = await params
  const { v, compare, edit } = await searchParams

  const view = await canViewDossier({ id: session.user.id, role: session.user.role }, id)
  if (!view.ok) notFound()

  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      lead: {
        include: {
          closer: { select: { name: true } },
          signals: { where: { status: { not: 'TRAITE' } }, take: 5 },
        },
      },
      versions: { orderBy: { numero: 'desc' } },
      dossierEvents: { orderBy: { createdAt: 'desc' }, take: 25 },
    },
  })
  if (!dossier || dossier.versions.length === 0) notFound()

  // Audit : chaque lecture interne est journalisée.
  await recordConsultation(id, {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name ?? undefined,
  })

  const current = dossier.versions[0]!
  const selectedNumero = Number(v) || current.numero
  const selected = dossier.versions.find((x) => x.numero === selectedNumero) ?? current
  const parsed = dossierDataSchema.safeParse(selected.data)
  if (!parsed.success) notFound()
  const data: DossierData = view.financials ? parsed.data : stripFinancials(parsed.data)

  const completeness = computeCompleteness(dossier.funnel, data)
  const rates = await loadRefRates()
  const calibration = view.financials
    ? calibrateOffers(dossier.funnel, data, rates, ['saron', 5, 10, 15])
    : null

  const montant = deriveMontantTotal(dossier.funnel, data)
  const valeur = data.bien.valeur ?? data.bien.prixAchat ?? null
  const revenus = totalRevenus(data)
  const chargesTiers = data.emprunteurs.flatMap((e) => e.charges).reduce((s, c) => s + c.montantAnnuel, 0)
  const tenue = revenus > 0 && valeur && montant ? (annualCosts(valeur, montant) + chargesTiers) / revenus : null
  const joursEcheance = dossier.echeanceProche
    ? // eslint-disable-next-line react-hooks/purity -- RSC rendu à la requête : le compte à rebours dépend de l'instant présent
      Math.ceil((dossier.echeanceProche.getTime() - Date.now()) / 86_400_000)
    : null

  // Badges cross-sell : 3a (amortissement indirect probable) + consolidation.
  const ltv = calibration?.ltv ?? null
  const crossSell: string[] = []
  if (view.financials && ltv !== null && ltv > 0.65) crossSell.push('Pilier 3a — amortissement indirect probable')
  if (
    view.financials &&
    data.emprunteurs.some((e) =>
      e.avoirs.some((a) => a.typeBancaire === 'COMPTE_3A' || a.typeBancaire === 'TITRES_3A' || a.typeBancaire === 'LIBRE_PASSAGE')
    )
  ) {
    crossSell.push('Consolidation 3a / libre passage')
  }

  const versionSummaries: VersionSummary[] = dossier.versions.map((version) => ({
    numero: version.numero,
    authorType: version.authorType,
    authorName: version.authorName,
    commentaire: version.commentaire,
    createdAt: fmtDateTime(version.createdAt),
  }))

  const canEdit = session.user.role !== 'PARTNER' && view.financials
  const editing = edit === '1' && canEdit && selectedNumero === current.numero

  // Vue « Comparer » : ?compare=a-b
  let diffEntries: ReturnType<typeof diffVersions> | null = null
  let diffLabel = ''
  if (compare) {
    const [a, b] = compare.split('-').map(Number)
    const va = dossier.versions.find((x) => x.numero === a)
    const vb = dossier.versions.find((x) => x.numero === b)
    if (va && vb) {
      diffEntries = diffVersions(va.data, vb.data)
      diffLabel = `v${va.numero} → v${vb.numero}`
    }
  }

  const nomClient = dossier.lead?.name ?? dossier.lead?.email ?? `Anonyme · ${dossier.id.slice(0, 8)}`

  return (
    <div className="space-y-5">
      {/* ── En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-ink-500 text-sm">
            <Link href="/admin/dossiers" className="hover:underline">
              Dossiers
            </Link>{' '}
            / {dossier.id.slice(0, 8)}
          </p>
          <h1 className="font-display mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {nomClient}
            <Badge variant="secondary">{FUNNEL_LABELS[dossier.funnel]}</Badge>
            {dossier.lead ? <Badge variant="outline">{STATUT_LABELS[dossier.lead.status] ?? dossier.lead.status}</Badge> : null}
            {dossier.complex ? <Badge className="bg-ambre-100 text-ambre-700">Cas complexe</Badge> : null}
          </h1>
          {dossier.complex ? (
            <p className="text-ambre-700 mt-1 flex items-center gap-1.5 text-sm">
              <AlertTriangle className="size-3.5" />
              {dossier.complexReasons.map((r) => COMPLEX_LABELS[r] ?? r).join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          {dossier.echeanceProche ? (
            <div className="text-right">
              <p className="text-ink-500 flex items-center justify-end gap-1.5 text-xs uppercase tracking-[0.08em]">
                <CalendarClock className="size-3.5" /> Échéance
              </p>
              <p className="text-data text-2xl">{fmtDate(dossier.echeanceProche)}</p>
              <p className={cn('text-sm font-medium', (joursEcheance ?? 999) < 120 ? 'text-erreur' : 'text-ink-500')}>
                {joursEcheance !== null ? (joursEcheance < 0 ? 'échue' : `J−${joursEcheance}`) : ''}
              </p>
            </div>
          ) : null}
          {dossier.lead?.phone ? (
            <Button asChild size="sm">
              <a href={`tel:${dossier.lead.phone}`}>
                <Phone data-icon="inline-start" />
                Appeler
              </a>
            </Button>
          ) : null}
          {dossier.lead?.email ? (
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${dossier.lead.email}`}>
                <Mail data-icon="inline-start" />
                Email
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Versionnage */}
      <VersionsBar
        dossierId={dossier.id}
        versions={versionSummaries}
        selected={selectedNumero}
        canEdit={canEdit}
        canExport={session.user.role === 'ADMIN'}
      />
      {selected.commentaire ? (
        <p className="text-ink-700 border-pilot-200 bg-pilot-50/50 rounded-lg border px-3 py-2 text-sm">
          « {selected.commentaire} » — {selected.authorName}, {fmtDateTime(selected.createdAt)}
        </p>
      ) : null}

      {/* ── Jauge de complétude + manquants */}
      <div className="border-line flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4">
        <Progress value={completeness.percent} className="w-40" />
        <span className="text-data text-sm">{completeness.percent}%</span>
        {completeness.missing.length > 0 ? (
          <span className="text-ink-500 text-sm">
            À demander :{' '}
            {completeness.missing
              .slice(0, 6)
              .map((m) => questionLabel(`${m.key.replace(/#\d+$/, '')}.short`))
              .join(' · ')}
            {completeness.missing.length > 6 ? ` (+${completeness.missing.length - 6})` : ''}
          </span>
        ) : (
          <span className="text-pilot-700 text-sm font-medium">Dossier complet</span>
        )}
      </div>

      {/* ── Diff */}
      {diffEntries ? (
        <div className="border-line overflow-x-auto rounded-xl border bg-white">
          <div className="border-line flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display font-semibold">Comparaison {diffLabel}</h2>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/admin/dossiers/${dossier.id}?v=${selectedNumero}`}>Fermer</Link>
            </Button>
          </div>
          {diffEntries.length === 0 ? (
            <p className="text-ink-500 p-4 text-sm">Aucune différence entre ces versions.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-500 border-line border-b text-left">
                  <th className="px-4 py-2 font-medium">Champ</th>
                  <th className="px-4 py-2 font-medium">Avant</th>
                  <th className="px-4 py-2 font-medium">Après</th>
                </tr>
              </thead>
              <tbody>
                {diffEntries.map((entry) => (
                  <tr key={entry.path} className="border-line border-b last:border-0">
                    <td className="px-4 py-2">{entry.label}</td>
                    <td className="text-data bg-erreur/5 px-4 py-2">{entry.before}</td>
                    <td className="text-data bg-pilot-50 px-4 py-2">{entry.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {/* ── Édition versionnée OU lecture 4 colonnes */}
      {editing ? (
        <EditPanel
          dossierId={dossier.id}
          funnel={dossier.funnel}
          initialData={data}
          role={session.user.role}
          messages={{ wizard: (fr as Record<string, unknown>).wizard }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Colonne 1 · Bien */}
          <section className="border-line rounded-xl border bg-white p-4">
            <h2 className="font-display flex items-center gap-2 font-semibold">
              <Building2 className="text-pilot-600 size-4" /> Bien
            </h2>
            <dl className="mt-3 divide-line divide-y">
              <Row label="Usage" value={optionLabel('usage.options', data.bien.usage)} />
              <Row label="Type" value={optionLabel('typeBien.options', data.bien.type)} />
              <Row label="Localisation" value={data.bien.npa ? `${data.bien.canton ?? ''} ${data.bien.npa} ${data.bien.localite ?? ''}` : '—'} />
              <Row label="Standard éco" value={optionLabel('labelEco.options', data.bien.labelEco)} />
              <Row label="Chauffage" value={optionLabel('chauffage.options', data.bien.chauffage)} />
              <Row label="Valeur" value={data.bien.valeur ? formatCHF(data.bien.valeur) : '—'} data />
              <Row label="Source" value={optionLabel('valeur.sources', data.bien.valeurSource)} />
              {dossier.funnel === 'ACHAT' ? (
                <>
                  <Row label="Prix d'achat" value={data.bien.prixAchat ? formatCHF(data.bien.prixAchat) : '—'} data />
                  <Row label="Date d'achat" value={isoFr(data.bien.dateAchat)} data />
                  <Row label="Bien existant" value={data.bien.bienExistant == null ? '—' : data.bien.bienExistant ? 'Oui' : 'Non (neuf)'} />
                </>
              ) : null}
              <Row
                label="Autres biens"
                value={data.asks.autresBiens == null ? '—' : data.asks.autresBiens ? `Oui (${data.autresBiens.length})` : 'Non'}
              />
            </dl>
          </section>

          {/* Colonne 2 · Emprunteurs */}
          <section className="border-line rounded-xl border bg-white p-4">
            <h2 className="font-display flex items-center gap-2 font-semibold">
              <UsersRound className="text-pilot-600 size-4" /> Emprunteurs
            </h2>
            {data.emprunteurs.length === 0 ? (
              <p className="text-ink-500 mt-3 text-sm">Aucun emprunteur saisi.</p>
            ) : (
              data.emprunteurs.map((emp) => (
                <dl key={emp.ordre} className="divide-line mt-3 divide-y">
                  <p className="text-ink-500 pt-1 text-xs font-semibold tracking-[0.08em] uppercase">
                    Emprunteur {emp.ordre}
                    {emp.prenom || emp.nom ? ` — ${[emp.prenom, emp.nom].filter(Boolean).join(' ')}` : ''}
                  </p>
                  <Row label="Nationalité" value={optionLabel('emprunteurIdentite.nationaliteOptions', emp.nationalite)} />
                  {emp.permis ? <Row label="Permis" value={optionLabel('emprunteurIdentite.permisOptions', emp.permis)} /> : null}
                  {emp.fatca != null ? <Row label="Lien fiscal USA" value={emp.fatca ? 'Oui' : 'Non'} /> : null}
                  <Row label="Résidence" value={optionLabel('emprunteurIdentite.residenceOptions', emp.residenceFuture)} />
                  <Row label="Naissance" value={view.financials ? (emp.anneeNaissance ?? '—') : '🛡'} data />
                  <Row
                    label="Revenus"
                    value={view.financials ? formatCHF(emp.revenus.reduce((s, r) => s + r.montantAnnuel, 0)) : '🛡'}
                    data
                  />
                  <Row
                    label="Avoirs"
                    value={view.financials ? formatCHF(emp.avoirs.reduce((s, a) => s + a.montant, 0)) : '🛡'}
                    data
                  />
                  <Row
                    label="Charges"
                    value={view.financials ? formatCHF(emp.charges.reduce((s, c) => s + c.montantAnnuel, 0)) : '🛡'}
                    data
                  />
                  <Row
                    label="Poursuites"
                    value={
                      !view.financials
                        ? '🛡'
                        : emp.aPoursuites == null
                          ? '—'
                          : emp.aPoursuites
                            ? `Oui (${emp.poursuites.length}${emp.poursuites.some((p) => !p.soldee) ? ', non soldée' : ''})`
                            : 'Non'
                    }
                  />
                </dl>
              ))
            )}
          </section>

          {/* Colonne 3 · Hypothèque */}
          <section className="border-line rounded-xl border bg-white p-4">
            <h2 className="font-display flex items-center gap-2 font-semibold">
              <Landmark className="text-pilot-600 size-4" /> Hypothèque
            </h2>
            <dl className="divide-line mt-3 divide-y">
              <Row label="Montant total" value={view.financials && montant ? formatCHF(montant) : view.financials ? '—' : '🛡'} data />
              {dossier.funnel !== 'ACHAT' ? (
                <Row
                  label="Ajustement"
                  value={optionLabel('ajustement.options', data.ajustement.sens)}
                />
              ) : (
                <Row label="Fonds propres" value={view.financials && data.bien.fondsPropres != null ? formatCHF(data.bien.fondsPropres) : view.financials ? '—' : '🛡'} data />
              )}
            </dl>
            {view.financials && data.tranchesExistantes.length > 0 ? (
              <>
                <p className="text-ink-500 mt-3 text-xs font-semibold tracking-[0.08em] uppercase">Tranches existantes</p>
                <ul className="divide-line divide-y text-sm">
                  {data.tranchesExistantes.map((t, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 py-1.5">
                      <span className="truncate">
                        {t.lenderNom ?? '—'} · {optionLabel('tranchesExistantes.produits', t.produit)}
                        {t.taux != null ? ` · ${formatRate(t.taux)}` : ''}
                      </span>
                      <span className="text-data shrink-0">
                        {formatCHF(t.montant)} · {isoFr(t.echeance)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {view.financials && data.tranchesSouhaitees.length > 0 ? (
              <>
                <p className="text-ink-500 mt-3 text-xs font-semibold tracking-[0.08em] uppercase">Configuration souhaitée</p>
                <ul className="divide-line divide-y text-sm">
                  {data.tranchesSouhaitees.map((t, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 py-1.5">
                      <span>
                        {optionLabel('tranchesSouhaitees.produits', t.produit)}
                        {t.dureeAnnees ? ` ${t.dureeAnnees} ans` : ''}
                      </span>
                      <span className="text-data">{formatCHF(t.montant)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          {/* Colonne 4 · Offres & activité */}
          <section className="border-line rounded-xl border bg-white p-4">
            <h2 className="font-display flex items-center gap-2 font-semibold">
              <BadgePercent className="text-pilot-600 size-4" /> Offres &amp; activité
            </h2>
            {calibration ? (
              <dl className="divide-line mt-3 divide-y">
                <Row label="LTV" value={ltv !== null ? `${Math.round(ltv * 100)}%` : '—'} data />
                <Row
                  label="Tenue des charges"
                  value={
                    tenue !== null ? (
                      <span
                        className={cn(
                          'font-medium',
                          tenue <= CHARGE_MAX ? 'text-pilot-700' : tenue <= CHARGE_MAX + 0.05 ? 'text-ambre-700' : 'text-erreur'
                        )}
                      >
                        {tenue <= CHARGE_MAX ? '🟢' : tenue <= CHARGE_MAX + 0.05 ? '🟠' : '🔴'}{' '}
                        {Math.round(tenue * 100)}%
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <Row
                  label={calibration.calibrated ? 'Fourchette calibrée (10 ans)' : 'Estimation (10 ans)'}
                  value={(() => {
                    const offer = calibration.offers.find((o) => o.term === 10 && o.lenderType === 'BANQUE')
                    return offer ? `${formatRate(offer.min)} – ${formatRate(offer.max)}` : '—'
                  })()}
                  data
                />
              </dl>
            ) : (
              <p className="text-ink-500 mt-3 text-sm">Données financières masquées (accès apporteur).</p>
            )}
            {crossSell.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {crossSell.map((badge) => (
                  <Badge key={badge} className="bg-pilot-50 text-pilot-700">
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="text-ink-500 mt-4 flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] uppercase">
              <Activity className="size-3.5" /> Timeline
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {dossier.dossierEvents.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{EVENT_LABELS[event.type] ?? event.type}</span>
                  <span className="text-data text-ink-400 shrink-0 text-xs">{formatAge(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
