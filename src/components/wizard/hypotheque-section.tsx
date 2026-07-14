'use client'

import { useTranslations } from 'next-intl'
import { Split } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
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
  patch,
  highlightKey,
}: {
  funnel: Funnel
  data: DossierData
  patch: (updater: (prev: DossierData) => DossierData) => void
  highlightKey: string | null
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
            /* Pas encore de prix d'achat (ex. bascule depuis le renouvellement) :
               on le demande ici, puis le curseur apparaît avec un défaut à 20%. */
            <div className="space-y-2">
              <Label htmlFor="w-fp-prix">{t('achatInfos.prixAchat')}</Label>
              <AmountInput
                id="w-fp-prix"
                value={data.bien.prixAchat ?? null}
                onChange={(v) => {
                  if (!v) {
                    patch((prev) => ({ ...prev, bien: { ...prev.bien, prixAchat: null } }))
                    return
                  }
                  const fp = Math.round((v * 0.2) / 5000) * 5000
                  patch((prev) => ({
                    ...prev,
                    montantTotal: v - fp,
                    bien: { ...prev.bien, prixAchat: v, fondsPropres: fp },
                  }))
                }}
              />
              <p className="text-ink-500 text-xs leading-relaxed">
                {t('fondsPropres.prixAchatPrompt')}
              </p>
            </div>
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
    </div>
  )
}

