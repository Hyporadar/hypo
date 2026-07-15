'use client'

import { useTranslations } from 'next-intl'
import type { Funnel } from '@prisma/client'
import { formatCHF } from '@/lib/format'
import { deriveMontantTotal, type DossierData } from '@/lib/dossier/schema'
import { QuestionCard, type QuestionStatus } from '@/components/wizard/question-card'
import { AmountInput } from '@/components/wizard/inputs'
import { OptionList } from '@/components/wizard/option-list'
import { Label } from '@/components/ui/label'

type Tranche = DossierData['tranchesSouhaitees'][number]

// Préférence de taux : une seule tranche couvrant tout le montant. Les
// propositions précises (multi-tranches, split…) sont faites par le
// conseiller après l'estimation — ici on ne capte qu'une préférence.
const PREFS = [
  { key: 'SARON', produit: 'SARON', duree: null },
  { key: 'FIXE_2', produit: 'FIXE', duree: 2 },
  { key: 'FIXE_5', produit: 'FIXE', duree: 5 },
  { key: 'FIXE_10', produit: 'FIXE', duree: 10 },
  // « Aucune préférence » : tranche par défaut (fixe 10 ans) pour le calcul,
  // le conseiller proposera la structure.
  { key: 'AUCUNE', produit: 'FIXE', duree: 10 },
] as const

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Fonds propres repris/dérivés du prix d'achat (défaut 20 % si rien). */
function derivedFonds(data: DossierData): number | null {
  const prix = data.bien.prixAchat
  if (prix == null) return null
  return data.bien.fondsPropres ?? Math.max(0, prix - (data.montantTotal ?? Math.round(prix * 0.8)))
}

// ─── Section 3 · L'hypothèque ──────────────────────────────────────────
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

  const prix = data.bien.prixAchat ?? null
  const fondsPropres = derivedFonds(data)
  // Montant emprunté : prix − fonds propres (achat) ou dérivé (renouvellement).
  const montant =
    funnel === 'ACHAT'
      ? prix != null
        ? Math.max(0, prix - (fondsPropres ?? 0))
        : null
      : deriveMontantTotal(funnel, data)
  const tranches = data.tranchesSouhaitees

  // Patch + resynchronisation : la tranche de préférence suit toujours le
  // montant total (sinon la somme ne collerait plus après un ajustement).
  function patchSync(updater: (prev: DossierData) => DossierData) {
    patch((prev) => {
      const next = updater(prev)
      const nt = deriveMontantTotal(funnel, next)
      if (next.tranchesSouhaitees.length === 1 && nt != null) {
        return { ...next, tranchesSouhaitees: [{ ...next.tranchesSouhaitees[0]!, montant: nt }] }
      }
      return next
    })
  }

  const ajustementDone =
    data.ajustement.sens != null &&
    (data.ajustement.sens === 'AUCUN' || data.ajustement.montant != null) &&
    (data.ajustement.sens !== 'AUGMENTER' || data.ajustement.raison != null)

  // Achat : dès que le prix d'achat est connu, la répartition est reprise et
  // valide (éditable) — pas besoin d'une action pour « valider ».
  const first = funnel === 'ACHAT' ? prix != null : ajustementDone
  const prefDone = data.preferenceTaux != null

  const statusFirst: QuestionStatus = first ? 'complete' : 'required'
  const statusPref: QuestionStatus = prefDone ? 'complete' : first ? 'required' : 'untouched'

  const prefKey = data.preferenceTaux ?? null

  function setPreference(pref: (typeof PREFS)[number]) {
    patchSync((prev) => {
      // Persiste les fonds propres repris (source de vérité) si pas encore fixés.
      const df = derivedFonds(prev)
      const bien =
        funnel === 'ACHAT' && prev.bien.fondsPropres == null && df != null
          ? { ...prev.bien, fondsPropres: df }
          : prev.bien
      return {
        ...prev,
        bien,
        preferenceTaux: pref.key,
        tranchesSouhaitees: [
          {
            produit: pref.produit as Tranche['produit'],
            dureeAnnees: pref.duree,
            montant: 0,
            dateDebut: null,
          },
        ],
      }
    })
  }

  return (
    <div className="space-y-4">
      {funnel === 'ACHAT' ? (
        /* Hypothèque ↔ fonds propres : repris du début, éditables */
        <QuestionCard
          id="fondsPropres"
          title={t('fondsPropres.title')}
          subtitle={t('fondsPropres.subtitle')}
          status={statusFirst}
          highlight={highlightKey === 'fondsPropres'}
        >
          {prix != null ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="w-fp-hyp">{t('fondsPropres.mortgageLabel')}</Label>
                  <AmountInput
                    id="w-fp-hyp"
                    value={montant}
                    onChange={(v) =>
                      patchSync((prev) => ({
                        ...prev,
                        bien: { ...prev.bien, fondsPropres: clamp(prix - (v ?? 0), 0, prix) },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-fp-fp">{t('fondsPropres.ownFundsLabel')}</Label>
                  <AmountInput
                    id="w-fp-fp"
                    value={fondsPropres}
                    onChange={(v) =>
                      patchSync((prev) => ({
                        ...prev,
                        bien: { ...prev.bien, fondsPropres: clamp(v ?? 0, 0, prix) },
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-ink-500 text-center text-sm">
                {t('fondsPropres.totalLabel')} <span className="text-data">{formatCHF(prix)}</span>
              </p>
              <p className="text-ink-500 text-xs leading-relaxed">{t('fondsPropres.note')}</p>
            </div>
          ) : (
            /* Pas de prix d'achat : on le demande (défaut fonds propres 20 %). */
            <div className="space-y-2">
              <Label htmlFor="w-fp-prix">{t('achatInfos.prixAchat')}</Label>
              <AmountInput
                id="w-fp-prix"
                value={null}
                onChange={(v) => {
                  if (!v) return
                  const fp = Math.round((v * 0.2) / 5000) * 5000
                  patchSync((prev) => ({
                    ...prev,
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
        /* Renouvellement : augmenter / réduire l'hypothèque existante */
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
                patchSync((prev) => ({
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
                    patchSync((prev) => ({ ...prev, ajustement: { ...prev.ajustement, montant: v } }))
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
                      patchSync((prev) => ({ ...prev, ajustement: { ...prev.ajustement, montant: v } }))
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
                      patchSync((prev) => ({ ...prev, ajustement: { ...prev.ajustement, raison: v } }))
                    }
                  />
                </div>
              </>
            ) : null}
          </div>
        </QuestionCard>
      )}

      {/* Préférence de taux — une simple préférence, pas de configurateur */}
      {first && montant ? (
        <QuestionCard
          id="tranchesSouhaitees"
          title={t('preferenceTaux.title')}
          subtitle={t('preferenceTaux.subtitle')}
          status={statusPref}
          highlight={highlightKey === 'tranchesSouhaitees'}
        >
          <OptionList<string>
            value={prefKey}
            options={PREFS.map((p) => ({
              value: p.key,
              label: t(`preferenceTaux.options.${p.key}`),
            }))}
            onSelect={(key) => {
              const pref = PREFS.find((p) => p.key === key)
              if (pref) setPreference(pref)
            }}
          />
        </QuestionCard>
      ) : null}
    </div>
  )
}
