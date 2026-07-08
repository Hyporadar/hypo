'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BellRing, CheckCircle2, MailCheck, Send, Split } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { formatCHF } from '@/lib/format'
import {
  deriveMontantTotal,
  validateTranches,
  type DossierData,
} from '@/lib/dossier/schema'
import { QuestionCard, type QuestionStatus } from '@/components/wizard/question-card'
import { AmountInput } from '@/components/wizard/inputs'
import { OptionList } from '@/components/wizard/option-list'
import { SplitSlider } from '@/components/wizard/sliders'
import { RepeatableGroup } from '@/components/wizard/repeatable-group'
import { subscribeRateAlertFromDossier } from '@/server/actions/rate-alerts'
import { requestMagicLink } from '@/server/actions/magic-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Tranche = DossierData['tranchesSouhaitees'][number]

const DUREES = Array.from({ length: 20 }, (_, i) => i + 1) // grille 1..20 ans (§3.1)
const TRANCHE_COLORS = ['bg-pilot-600', 'bg-pilot-400', 'bg-pilot-300', 'bg-pilot-200']

function isoToFr(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

// ─── Section 3 · L'hypothèque — configurateur (formulaire-complet §3) ──
export function HypothequeSection({
  funnel,
  data,
  dossierId,
  patch,
  highlightKey,
  showConversionCards = true,
}: {
  funnel: Funnel
  data: DossierData
  dossierId: string
  patch: (updater: (prev: DossierData) => DossierData) => void
  highlightKey: string | null
  /** Cartes alerte taux + compte — masquées en mode édition admin. */
  showConversionCards?: boolean
}) {
  const t = useTranslations('wizard.questions')
  const tc = useTranslations('wizard.common')

  const total = deriveMontantTotal(funnel, data)
  const tranches = data.tranchesSouhaitees
  const somme = tranches.reduce((s, x) => s + x.montant, 0)
  const { ok: sumOk, ecart } = validateTranches(data, funnel)

  const ajustementDone =
    data.ajustement.sens != null &&
    (data.ajustement.sens === 'AUCUN' || data.ajustement.montant != null) &&
    (data.ajustement.sens !== 'AUGMENTER' || data.ajustement.raison != null)
  const fondsPropresDone = data.bien.fondsPropres != null
  const tranchesDone =
    total != null &&
    tranches.length > 0 &&
    sumOk &&
    tranches.every((x) => x.produit !== 'FIXE' || x.dureeAnnees != null)

  const first = funnel === 'ACHAT' ? fondsPropresDone : ajustementDone
  const statusFirst: QuestionStatus = first ? 'complete' : 'required'
  const statusTranches: QuestionStatus = tranchesDone ? 'complete' : first ? 'required' : 'untouched'

  /** Préremplit le configurateur depuis les tranches existantes (renouvellement). */
  function fromExisting() {
    patch((prev) => ({
      ...prev,
      tranchesSouhaitees: prev.tranchesExistantes.map((te) => ({
        produit: te.produit,
        dureeAnnees: te.produit === 'FIXE' ? 10 : null,
        montant: te.montant,
        dateDebut: te.echeance ?? null,
      })),
    }))
  }

  return (
    <div className="space-y-4">
      {funnel === 'ACHAT' ? (
        /* §3.2 — slider fonds propres ↔ hypothèque sur le prix d'achat */
        <QuestionCard
          id="fondsPropres"
          title={t('fondsPropres.title')}
          subtitle={t('fondsPropres.subtitle')}
          status={statusFirst}
          highlight={highlightKey === 'fondsPropres'}
        >
          {data.bien.prixAchat ? (
            <div className="space-y-3">
              <SplitSlider
                total={data.bien.prixAchat}
                mortgage={
                  data.bien.prixAchat - (data.bien.fondsPropres ?? Math.round(data.bien.prixAchat * 0.2))
                }
                mortgageLabel={t('fondsPropres.mortgageLabel')}
                ownFundsLabel={t('fondsPropres.ownFundsLabel')}
                totalLabel={t('fondsPropres.totalLabel')}
                onChange={(mortgage) => {
                  patch((prev) => ({
                    ...prev,
                    montantTotal: mortgage,
                    bien: {
                      ...prev.bien,
                      fondsPropres: (prev.bien.prixAchat ?? 0) - mortgage,
                    },
                  }))
                }}
              />
              <p className="text-ink-500 text-xs leading-relaxed">{t('fondsPropres.note')}</p>
            </div>
          ) : (
            <p className="text-ink-500 text-sm">{t('achatInfos.prixAchat')} — {tc('sensitive')}</p>
          )}
        </QuestionCard>
      ) : (
        /* §3.1 — augmenter / réduire l'hypothèque existante */
        <QuestionCard
          id="ajustement"
          title={t('ajustement.title')}
          status={statusFirst}
          highlight={highlightKey === 'ajustement'}
        >
          <div className="space-y-4">
            <OptionList
              value={data.ajustement.sens ?? null}
              options={(['AUCUN', 'REDUIRE', 'AUGMENTER'] as const).map((v) => ({
                value: v,
                label: t(`ajustement.options.${v}`),
              }))}
              onSelect={(v) => {
                patch((prev) => ({
                  ...prev,
                  ajustement: {
                    sens: v,
                    montant: v === 'AUCUN' ? null : prev.ajustement.montant,
                    raison: v === 'AUGMENTER' ? prev.ajustement.raison : null,
                  },
                }))
              }}
            />
            {data.ajustement.sens === 'REDUIRE' ? (
              <div className="space-y-1.5">
                <Label htmlFor="w-aj-montant">{t('ajustement.montantReduction')}</Label>
                <AmountInput
                  id="w-aj-montant"
                  value={data.ajustement.montant ?? null}
                  onChange={(v) =>
                    patch((prev) => ({ ...prev, ajustement: { ...prev.ajustement, montant: v } }))
                  }
                />
              </div>
            ) : null}
            {data.ajustement.sens === 'AUGMENTER' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="w-aj-montant">{t('ajustement.montantAugmentation')}</Label>
                  <AmountInput
                    id="w-aj-montant"
                    value={data.ajustement.montant ?? null}
                    onChange={(v) =>
                      patch((prev) => ({ ...prev, ajustement: { ...prev.ajustement, montant: v } }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ajustement.raison')}</Label>
                  <OptionList<string>
                    value={data.ajustement.raison ?? null}
                    options={(['renovation', 'agrandissement', 'les-deux', 'autre'] as const).map(
                      (v) => ({ value: v, label: t(`ajustement.raisons.${v}`) })
                    )}
                    onSelect={(v) =>
                      patch((prev) => ({ ...prev, ajustement: { ...prev.ajustement, raison: v } }))
                    }
                  />
                </div>
              </>
            ) : null}
          </div>
        </QuestionCard>
      )}

      {/* Configurateur de tranches : modèle + durée + montant, split */}
      {first && total ? (
        <QuestionCard
          id="tranchesSouhaitees"
          title={t('tranchesSouhaitees.title')}
          subtitle={t('tranchesSouhaitees.subtitle')}
          info={t('tranchesSouhaitees.info')}
          status={statusTranches}
          highlight={highlightKey === 'tranchesSouhaitees'}
        >
          <div className="space-y-4">
            {/* Barre de répartition visuelle */}
            <div>
              <div className="border-line flex h-8 w-full overflow-hidden rounded-full border">
                {tranches.map((tranche, i) => (
                  <div
                    key={i}
                    className={TRANCHE_COLORS[i % TRANCHE_COLORS.length]}
                    style={{ width: `${Math.min(100, (tranche.montant / total) * 100)}%` }}
                    title={formatCHF(tranche.montant)}
                  />
                ))}
                <div className="bg-surface-alt flex-1" />
              </div>
              <p
                className={
                  sumOk && tranches.length > 0
                    ? 'text-pilot-700 mt-2 text-sm'
                    : 'text-ambre-700 mt-2 text-sm'
                }
                aria-live="polite"
              >
                {tranches.length === 0 ? (
                  <>
                    {t('tranchesSouhaitees.reparti')}{' '}
                    <span className="text-data">{formatCHF(0)}</span> ·{' '}
                    {t('tranchesSouhaitees.totalLabel')}{' '}
                    <span className="text-data">{formatCHF(total)}</span>
                  </>
                ) : sumOk ? (
                  t('tranchesSouhaitees.sumOk')
                ) : (
                  <>
                    {ecart < 0 ? t('tranchesSouhaitees.reste') : t('tranchesSouhaitees.depassement')}{' '}
                    <span className="text-data">{formatCHF(Math.abs(ecart))}</span>
                  </>
                )}
              </p>
            </div>

            {/* Renouvellement : reprise en un clic des tranches existantes */}
            {funnel !== 'ACHAT' && tranches.length === 0 && data.tranchesExistantes.length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={fromExisting}>
                <Split data-icon="inline-start" />
                {t('tranchesSouhaitees.fromExisting')}
              </Button>
            ) : null}

            <RepeatableGroup<Tranche>
              items={tranches}
              onChange={(items) => patch((prev) => ({ ...prev, tranchesSouhaitees: items }))}
              makeEmpty={() => ({
                produit: 'FIXE',
                dureeAnnees: 10,
                montant: Math.max(0, total - somme),
                dateDebut: null,
              })}
              maxItems={4}
              labels={{
                done: tc('done'),
                add: tc('add'),
                edit: tc('edit'),
                remove: tc('remove'),
                totalLabel: t('tranchesSouhaitees.totalLabel'),
              }}
              total={formatCHF(somme)}
              renderSummary={(item) => (
                <span>
                  {t(`tranchesSouhaitees.produits.${item.produit}`)}
                  {item.produit === 'FIXE' && item.dureeAnnees ? (
                    <span className="text-ink-500">
                      {' '}
                      · {t('tranchesSouhaitees.dureeAnnees', { years: item.dureeAnnees })}
                    </span>
                  ) : null}{' '}
                  · <span className="text-data">{formatCHF(item.montant)}</span>
                  {item.dateDebut ? (
                    <span className="text-ink-500"> · {isoToFr(item.dateDebut)}</span>
                  ) : null}
                </span>
              )}
              renderForm={(item, update) => (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>{t('tranchesSouhaitees.produit')}</Label>
                      <Select
                        value={item.produit}
                        onValueChange={(v) =>
                          update({
                            produit: v as Tranche['produit'],
                            dureeAnnees: v === 'FIXE' ? (item.dureeAnnees ?? 10) : null,
                          })
                        }
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['SARON', 'VARIABLE', 'FIXE'] as const).map((p) => (
                            <SelectItem key={p} value={p}>
                              {t(`tranchesSouhaitees.produits.${p}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {item.produit === 'FIXE' ? (
                      <div className="space-y-1.5">
                        <Label>{t('tranchesSouhaitees.duree')}</Label>
                        <Select
                          value={String(item.dureeAnnees ?? 10)}
                          onValueChange={(v) => update({ dureeAnnees: Number(v) })}
                        >
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DUREES.map((years) => (
                              <SelectItem key={years} value={String(years)}>
                                {t('tranchesSouhaitees.dureeAnnees', { years })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label>{t('tranchesSouhaitees.montant')}</Label>
                      <AmountInput
                        id="w-tranche-montant"
                        value={item.montant || null}
                        onChange={(v) => update({ montant: v ?? 0 })}
                      />
                    </div>
                  </div>
                  {/* Splitter : moitié dans une nouvelle tranche */}
                  {item.montant > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const half = Math.round(item.montant / 2 / 5000) * 5000
                        update({ montant: item.montant - half })
                        patch((prev) => ({
                          ...prev,
                          tranchesSouhaitees: [
                            ...prev.tranchesSouhaitees,
                            { produit: 'FIXE', dureeAnnees: 5, montant: half, dateDebut: item.dateDebut },
                          ],
                        }))
                      }}
                    >
                      <Split data-icon="inline-start" />
                      {t('tranchesSouhaitees.split')}
                    </Button>
                  ) : null}
                  {item.dateDebut ? (
                    <p className="text-ink-500 text-xs">
                      {t('tranchesSouhaitees.dateDebut')} : {isoToFr(item.dateDebut)} —{' '}
                      {t('tranchesSouhaitees.dateDebutInfo')}
                    </p>
                  ) : null}
                </div>
              )}
            />
          </div>
        </QuestionCard>
      ) : null}

      {/* Alerte taux (double opt-in) + compte (magic link) */}
      {showConversionCards ? (
        <>
          <RateAlertCard dossierId={dossierId} />
          <AccountCard dossierId={dossierId} />
        </>
      ) : null}
    </div>
  )
}

// ─── Abonnement aux taux — double opt-in ───────────────────────────────
function RateAlertCard({ dossierId }: { dossierId: string }) {
  const t = useTranslations('wizard.rateAlert')
  const searchParams = useSearchParams()
  const confirmedViaLink = searchParams.get('rateAlert') === 'confirmed'
  const [email, setEmail] = useState('')
  const [frequency, setFrequency] = useState<'QUOTIDIEN' | 'HEBDOMADAIRE' | 'MENSUEL'>(
    'HEBDOMADAIRE'
  )
  const [state, setState] = useState<'idle' | 'sent' | 'already' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await subscribeRateAlertFromDossier({ email, frequency, dossierId }).catch(
        () => ({ ok: false as const })
      )
      if (!result.ok) setState('error')
      else setState('alreadyConfirmed' in result && result.alreadyConfirmed ? 'already' : 'sent')
    })
  }

  return (
    <div className="border-line rounded-xl border bg-white p-5">
      <h3 className="font-display flex items-center gap-2 font-semibold">
        <BellRing className="text-pilot-600 size-4" />
        {t('title')}
      </h3>
      {confirmedViaLink ? (
        <p className="text-pilot-700 mt-2 flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 shrink-0" />
          {t('confirmed')}
        </p>
      ) : state === 'sent' ? (
        <p className="text-pilot-700 mt-2 flex items-center gap-2 text-sm">
          <MailCheck className="size-4 shrink-0" />
          {t('sent', { email })}
        </p>
      ) : state === 'already' ? (
        <p className="text-pilot-700 mt-2 text-sm">{t('alreadyConfirmed')}</p>
      ) : (
        <>
          <p className="text-ink-500 mt-1 text-sm leading-relaxed">{t('body')}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label={t('emailPlaceholder')}
              placeholder={t('emailPlaceholder')}
              className="h-11 flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger aria-label={t('frequency')} className="h-11 sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL'] as const).map((f) => (
                  <SelectItem key={f} value={f}>
                    {t(`frequencies.${f}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" disabled={pending || !email.includes('@')} onClick={submit}>
              {t('cta')}
            </Button>
          </div>
          {state === 'error' ? <p className="text-erreur mt-2 text-sm">{t('error')}</p> : null}
        </>
      )}
    </div>
  )
}

// ─── Compte sans mot de passe (magic link) ─────────────────────────────
function AccountCard({ dossierId }: { dossierId: string }) {
  const t = useTranslations('wizard.account')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sent' | 'throttled' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await requestMagicLink({ email, dossierId }).catch(() => ({
        ok: false as const,
        error: 'server' as const,
      }))
      if (result.ok) setState('sent')
      else setState(result.error === 'throttled' ? 'throttled' : 'error')
    })
  }

  return (
    <div className="border-pilot-200 bg-pilot-50/50 rounded-xl border p-5">
      <h3 className="font-display flex items-center gap-2 font-semibold">
        <Send className="text-pilot-600 size-4" />
        {t('title')}
      </h3>
      {state === 'sent' ? (
        <p className="text-pilot-700 mt-2 flex items-center gap-2 text-sm">
          <MailCheck className="size-4 shrink-0" />
          {t('sent', { email })}
        </p>
      ) : (
        <>
          <p className="text-ink-700 mt-1 text-sm leading-relaxed">{t('body')}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label={t('emailPlaceholder')}
              placeholder={t('emailPlaceholder')}
              className="h-11 flex-1 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="button" disabled={pending || !email.includes('@')} onClick={submit}>
              {t('cta')}
            </Button>
          </div>
          {state === 'throttled' ? (
            <p className="text-ambre-700 mt-2 text-sm">{t('throttled')}</p>
          ) : null}
          {state === 'error' ? <p className="text-erreur mt-2 text-sm">{t('error')}</p> : null}
        </>
      )}
    </div>
  )
}
