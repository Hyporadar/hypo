'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarClock } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { formatCHF } from '@/lib/format'
import type { AutreBienData, DossierData } from '@/lib/dossier/schema'
import { QuestionCard, type QuestionStatus } from '@/components/wizard/question-card'
import { OptionList, OptionListIllustrated } from '@/components/wizard/option-list'
import { AmountInput, DateInput, YesNoToggle } from '@/components/wizard/inputs'
import { AutocompleteField } from '@/components/wizard/autocomplete'
import { RepeatableGroup } from '@/components/wizard/repeatable-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Bien = DossierData['bien']
type Tranche = DossierData['tranchesExistantes'][number]
type AutrePret = DossierData['autresPrets'][number]

// Convertit JJ.MM.AAAA ↔ ISO (le schéma stocke l'ISO).
function frToIso(fr: string): string | null {
  const m = fr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}
function isoToFr(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

// ─── Section 1 · Le bien — arbre de docs/formulaire-complet.md §1 ──────
export function BienSection({
  funnel,
  data,
  setBien,
  patch,
  highlightKey,
  onAnswered,
}: {
  funnel: Funnel
  data: DossierData
  setBien: <K extends keyof Bien>(key: K, value: Bien[K]) => void
  patch: (updater: (prev: DossierData) => DossierData) => void
  highlightKey: string | null
  onAnswered: (questionKey: string) => void
}) {
  const t = useTranslations('wizard.questions')
  const tc = useTranslations('wizard.common')
  const b = data.bien

  // Prédicats « répondue » — mêmes règles que lib/dossier/completeness.ts.
  const usageDone =
    b.usage != null &&
    (b.usage !== 'VACANCES' || b.vacancesOccupation != null) &&
    (b.usage !== 'RENDEMENT' ||
      (b.locatifUsage != null && b.locatifTypeLocation != null && b.revenuLocatifAnnuel != null))
  const annexeDone =
    b.type !== 'MAISON' ||
    (b.annexe != null &&
      (!b.annexe || (b.annexeLouee != null && (!b.annexeLouee || b.revenuAnnexeAnnuel != null))))
  const typeDone = b.type != null && annexeDone
  const casSpeciauxDone =
    b.droitHabitation != null &&
    b.usufruit != null &&
    b.droitSuperficie != null &&
    b.zoneAgricole != null
  const achatInfosDone =
    b.bienExistant != null &&
    b.prixAchat != null &&
    b.dateAchatFixee != null &&
    (!b.dateAchatFixee || b.dateAchat != null) &&
    b.renovationImmediate != null
  const valeurDone = b.valeur != null && b.valeurSource != null

  const steps = useMemo(() => {
    const list: Array<{ key: string; done: boolean }> = [
      { key: 'usage', done: usageDone },
      { key: 'typeBien', done: typeDone },
      { key: 'adresse', done: Boolean(b.npa && b.localite) },
      { key: 'labelEco', done: b.labelEco != null },
      { key: 'chauffage', done: b.chauffage != null },
      { key: 'casSpeciaux', done: casSpeciauxDone },
    ]
    if (funnel === 'ACHAT') list.push({ key: 'achatInfos', done: achatInfosDone })
    list.push({ key: 'valeur', done: valeurDone })
    if (funnel === 'ACHAT') {
      list.push({
        key: 'autresPrets',
        done: data.asks.autresPrets != null && (!data.asks.autresPrets || data.autresPrets.length > 0),
      })
    } else {
      list.push({
        key: 'tranchesExistantes',
        done:
          data.tranchesExistantes.length > 0 &&
          data.tranchesExistantes.every((x) => x.montant > 0 && x.echeance != null),
      })
    }
    list.push({
      key: 'autresBiens',
      done:
        data.asks.autresBiens != null &&
        (!data.asks.autresBiens ||
          (data.autresBiens.length > 0 &&
            data.autresBiens.every((ab) => ab.usage != null && ab.genre != null && ab.valeur != null))),
    })
    return list
  }, [b, data, funnel, usageDone, typeDone, casSpeciauxDone, achatInfosDone, valeurDone])

  // Une question est visible si toutes les précédentes sont répondues.
  const visibleUpTo = useMemo(() => {
    let i = 0
    while (i < steps.length && steps[i]!.done) i++
    return i
  }, [steps])

  function statusOf(key: string): QuestionStatus {
    const index = steps.findIndex((s) => s.key === key)
    if (steps[index]!.done) return 'complete'
    if (index === visibleUpTo) return 'required'
    return 'untouched'
  }
  function visible(key: string): boolean {
    const index = steps.findIndex((s) => s.key === key)
    return index <= visibleUpTo
  }
  const answer = (key: string) => onAnswered(key)

  // Listes de types selon l'usage (liste étendue si bien loué — §1.1).
  const isLocatif = b.usage === 'RENDEMENT' || b.usage === 'LOUE_PARTIEL'
  const typeOptions = (
    isLocatif
      ? (['MAISON', 'APPARTEMENT_PPE', 'MAISON_MITOYENNE', 'PLUSIEURS_APPARTEMENTS', 'GRAND_ENSEMBLE'] as const)
      : (['MAISON', 'APPARTEMENT_PPE', 'MAISON_MITOYENNE'] as const)
  ).map((v) => ({
    value: v as NonNullable<Bien['type']>,
    label: t(`typeBien.options.${v}`),
    sublabel:
      v === 'APPARTEMENT_PPE'
        ? t('typeBien.options.APPARTEMENT_PPE_sub')
        : v === 'GRAND_ENSEMBLE'
          ? t('typeBien.options.GRAND_ENSEMBLE_sub')
          : undefined,
    icon: (v === 'MAISON'
      ? 'maison'
      : v === 'APPARTEMENT_PPE'
        ? 'appartement-ppe'
        : v === 'MAISON_MITOYENNE'
          ? 'maison-mitoyenne'
          : 'immeuble') as 'maison' | 'appartement-ppe' | 'maison-mitoyenne' | 'immeuble',
  }))

  return (
    <div className="space-y-4">
      {/* §1.1 Usage + branches locatives */}
      <QuestionCard
        id="usage"
        title={t('usage.title')}
        subtitle={t('usage.subtitle')}
        info={t('usage.info')}
        status={statusOf('usage')}
        highlight={highlightKey === 'usage'}
      >
        <div className="space-y-4">
          <OptionList
            value={b.usage === 'RESIDENCE_SECONDAIRE' ? 'VACANCES' : (b.usage ?? null)}
            options={[
              {
                value: 'RESIDENCE_PRINCIPALE' as const,
                label: t('usage.options.RESIDENCE_PRINCIPALE'),
                sublabel: t('usage.options.RESIDENCE_PRINCIPALE_sub'),
              },
              { value: 'VACANCES' as const, label: t('usage.options.VACANCES') },
              { value: 'RENDEMENT' as const, label: t('usage.options.RENDEMENT') },
              { value: 'LOUE_PARTIEL' as const, label: t('usage.options.LOUE_PARTIEL') },
            ]}
            onSelect={(v) => {
              patch((prev) => ({
                ...prev,
                bien: {
                  ...prev.bien,
                  usage: v,
                  vacancesOccupation: null,
                  locatifUsage: null,
                  locatifTypeLocation: null,
                },
              }))
              answer('usage')
            }}
          />
          {b.usage === 'VACANCES' ? (
            <div className="space-y-2">
              <Label>{t('usage.vacancesOccupation')}</Label>
              <OptionList
                value={b.vacancesOccupation ?? null}
                options={(['OCCUPE', 'LOUE_ET_OCCUPE', 'LOUE'] as const).map((v) => ({
                  value: v,
                  label: t(`usage.vacancesOptions.${v}`),
                }))}
                onSelect={(v) => setBien('vacancesOccupation', v)}
              />
            </div>
          ) : null}
          {b.usage === 'RENDEMENT' ? (
            <>
              <div className="space-y-2">
                <Label>{t('usage.locatifUsage')}</Label>
                <OptionList
                  value={b.locatifUsage ?? null}
                  options={(['RESIDENTIEL', 'MIXTE', 'COMMERCIAL'] as const).map((v) => ({
                    value: v,
                    label: t(`usage.locatifUsageOptions.${v}`),
                  }))}
                  onSelect={(v) => setBien('locatifUsage', v)}
                />
              </div>
              {b.locatifUsage ? (
                <div className="space-y-2">
                  <Label>{t('usage.locatifTypeLocation')}</Label>
                  <OptionList
                    value={b.locatifTypeLocation ?? null}
                    options={(['PERMANENT', 'TEMPORAIRE'] as const).map((v) => ({
                      value: v,
                      label: t(`usage.locatifTypeLocationOptions.${v}`),
                    }))}
                    onSelect={(v) => setBien('locatifTypeLocation', v)}
                  />
                </div>
              ) : null}
              {b.locatifTypeLocation ? (
                <div className="space-y-1.5">
                  <Label htmlFor="w-revenu-locatif">{t('usage.revenuLocatif')}</Label>
                  <AmountInput
                    id="w-revenu-locatif"
                    value={b.revenuLocatifAnnuel ?? null}
                    onChange={(v) => setBien('revenuLocatifAnnuel', v)}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </QuestionCard>

      {/* Type de bien + appartement annexe (maison individuelle) */}
      {visible('typeBien') ? (
        <QuestionCard
          id="typeBien"
          title={t('typeBien.title')}
          subtitle={t('typeBien.subtitle')}
          info={t('typeBien.info')}
          status={statusOf('typeBien')}
          highlight={highlightKey === 'typeBien'}
        >
          <div className="space-y-4">
            <OptionListIllustrated
              value={b.type ?? null}
              options={typeOptions}
              onSelect={(v) => {
                patch((prev) => ({
                  ...prev,
                  bien: { ...prev.bien, type: v, annexe: null, annexeLouee: null },
                }))
                answer('typeBien')
              }}
            />
            {b.type === 'MAISON' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('typeBien.annexe')}</Label>
                  <YesNoToggle
                    idBase="w-annexe"
                    yesLabel={tc('yes')}
                    noLabel={tc('no')}
                    value={b.annexe ?? null}
                    onChange={(yes) => {
                      patch((prev) => ({
                        ...prev,
                        bien: {
                          ...prev.bien,
                          annexe: yes,
                          annexeLouee: yes ? prev.bien.annexeLouee : null,
                          revenuAnnexeAnnuel: yes ? prev.bien.revenuAnnexeAnnuel : null,
                        },
                      }))
                    }}
                  />
                </div>
                {b.annexe ? (
                  <div className="space-y-2">
                    <Label>{t('typeBien.annexeLouee')}</Label>
                    <YesNoToggle
                      idBase="w-annexe-louee"
                      yesLabel={tc('yes')}
                      noLabel={tc('no')}
                      value={b.annexeLouee ?? null}
                      onChange={(yes) => setBien('annexeLouee', yes)}
                    />
                  </div>
                ) : null}
                {b.annexe && b.annexeLouee ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="w-revenu-annexe">{t('typeBien.revenuAnnexe')}</Label>
                    <AmountInput
                      id="w-revenu-annexe"
                      value={b.revenuAnnexeAnnuel ?? null}
                      onChange={(v) => setBien('revenuAnnexeAnnuel', v)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* NPA / localité */}
      {visible('adresse') ? (
        <QuestionCard
          id="adresse"
          title={t('adresse.title')}
          subtitle={t('adresse.subtitle')}
          info={t('adresse.info')}
          status={statusOf('adresse')}
          highlight={highlightKey === 'adresse'}
        >
          <AutocompleteField
            id="w-npa"
            endpoint="/api/localities"
            placeholder={t('adresse.npaPlaceholder')}
            value={
              b.npa && b.localite ? `${b.canton ? `${b.canton}-` : ''}${b.npa} ${b.localite}` : ''
            }
            onSelect={(item) => {
              const p = item.payload as { npa: string; localite: string; canton: string }
              patch((prev) => ({
                ...prev,
                bien: { ...prev.bien, npa: p.npa, localite: p.localite, canton: p.canton },
              }))
              answer('adresse')
            }}
          />
        </QuestionCard>
      ) : null}

      {/* Standard écologique */}
      {visible('labelEco') ? (
        <QuestionCard
          id="labelEco"
          title={t('labelEco.title')}
          info={t('labelEco.info')}
          status={statusOf('labelEco')}
          highlight={highlightKey === 'labelEco'}
        >
          <OptionList<string>
            value={b.labelEco ?? null}
            options={(['non', 'minergie', 'geak-cecb', 'snbs', 'autre'] as const).map((v) => ({
              value: v,
              label: t(`labelEco.options.${v}`),
            }))}
            onSelect={(v) => {
              setBien('labelEco', v)
              answer('labelEco')
            }}
          />
        </QuestionCard>
      ) : null}

      {/* Chauffage */}
      {visible('chauffage') ? (
        <QuestionCard
          id="chauffage"
          title={t('chauffage.title')}
          status={statusOf('chauffage')}
          highlight={highlightKey === 'chauffage'}
        >
          <OptionList<string>
            value={b.chauffage ?? null}
            options={(
              ['mazout', 'gaz', 'pac', 'distance', 'bois', 'electrique', 'autre'] as const
            ).map((v) => ({ value: v, label: t(`chauffage.options.${v}`) }))}
            onSelect={(v) => {
              setBien('chauffage', v)
              answer('chauffage')
            }}
          />
        </QuestionCard>
      ) : null}

      {/* Cas spéciaux : 4 × Non/Oui + note registre foncier */}
      {visible('casSpeciaux') ? (
        <QuestionCard
          id="casSpeciaux"
          title={t('casSpeciaux.title')}
          subtitle={t('casSpeciaux.subtitle')}
          status={statusOf('casSpeciaux')}
          highlight={highlightKey === 'casSpeciaux'}
        >
          <div className="space-y-5">
            {(
              [
                ['droitHabitation', t('casSpeciaux.droitHabitation')],
                ['usufruit', t('casSpeciaux.usufruit')],
                ['droitSuperficie', t('casSpeciaux.droitSuperficie')],
                ['zoneAgricole', t('casSpeciaux.zoneAgricole')],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <YesNoToggle
                  idBase={`w-${key}`}
                  yesLabel={tc('yes')}
                  noLabel={tc('no')}
                  value={b[key] ?? null}
                  onChange={(v) => {
                    setBien(key, v)
                    answer('casSpeciaux')
                  }}
                />
              </div>
            ))}
            <p className="text-ink-500 text-xs leading-relaxed">{t('casSpeciaux.noteRF')}</p>
          </div>
        </QuestionCard>
      ) : null}

      {/* §1.2 Informations sur l'achat */}
      {funnel === 'ACHAT' && visible('achatInfos') ? (
        <QuestionCard
          id="achatInfos"
          title={t('achatInfos.title')}
          status={statusOf('achatInfos')}
          highlight={highlightKey === 'achatInfos'}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('achatInfos.existant')}</Label>
              <YesNoToggle
                idBase="w-existant"
                yesLabel={t('achatInfos.existantOptions.existant')}
                noLabel={t('achatInfos.existantOptions.neuf')}
                value={b.bienExistant ?? null}
                onChange={(v) => {
                  setBien('bienExistant', v)
                  answer('achatInfos')
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-prix">{t('achatInfos.prixAchat')}</Label>
              <AmountInput
                id="w-prix"
                value={b.prixAchat ?? null}
                onChange={(v) => setBien('prixAchat', v)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('achatInfos.dateFixee')}</Label>
              <YesNoToggle
                idBase="w-date-fixee"
                yesLabel={tc('yes')}
                noLabel={tc('no')}
                value={b.dateAchatFixee ?? null}
                onChange={(v) => {
                  patch((prev) => ({
                    ...prev,
                    bien: { ...prev.bien, dateAchatFixee: v, dateAchat: v ? prev.bien.dateAchat : null },
                  }))
                }}
              />
              <p className="text-ink-500 text-xs">{t('achatInfos.dateFixeeInfo')}</p>
            </div>
            {b.dateAchatFixee ? (
              <div className="space-y-1.5">
                <Label htmlFor="w-date-achat">{t('achatInfos.dateAchat')}</Label>
                <DateInput
                  id="w-date-achat"
                  value={isoToFr(b.dateAchat)}
                  errorLabel={tc('invalidDate')}
                  onChange={(fr) => setBien('dateAchat', frToIso(fr))}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>{t('achatInfos.renovation')}</Label>
              <YesNoToggle
                idBase="w-renovation"
                yesLabel={tc('yes')}
                noLabel={tc('no')}
                value={b.renovationImmediate ?? null}
                onChange={(v) => setBien('renovationImmediate', v)}
              />
            </div>
          </div>
        </QuestionCard>
      ) : null}

      {/* §1.3 Valeur du bien + source de l'estimation */}
      {visible('valeur') ? (
        <QuestionCard
          id="valeur"
          title={t('valeur.title')}
          subtitle={t('valeur.subtitle')}
          info={t('valeur.info')}
          status={statusOf('valeur')}
          highlight={highlightKey === 'valeur'}
        >
          <div className="space-y-4">
            <AmountInput
              id="w-valeur"
              value={b.valeur ?? null}
              onChange={(v) => setBien('valeur', v)}
            />
            {b.valeur ? (
              <div className="space-y-2">
                <Label>{t('valeur.source')}</Label>
                <OptionList<string>
                  value={b.valeurSource ?? null}
                  options={(['banque', 'en-ligne', 'agent', 'expert', 'propre'] as const).map(
                    (v) => ({ value: v, label: t(`valeur.sources.${v}`) })
                  )}
                  onSelect={(v) => {
                    setBien('valeurSource', v)
                    answer('valeur')
                  }}
                />
              </div>
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {funnel === 'ACHAT' ? (
        /* §1.5 Autres prêts liés au bien */
        visible('autresPrets') ? (
          <QuestionCard
            id="autresPrets"
            title={t('autresPrets.title')}
            subtitle={t('autresPrets.subtitle')}
            status={statusOf('autresPrets')}
            highlight={highlightKey === 'autresPrets'}
          >
            <div className="space-y-3">
              <YesNoToggle
                idBase="w-autres-prets"
                yesLabel={tc('yes')}
                noLabel={tc('no')}
                value={data.asks.autresPrets ?? null}
                onChange={(yes) => {
                  patch((prev) => ({
                    ...prev,
                    asks: { ...prev.asks, autresPrets: yes },
                    autresPrets: yes ? prev.autresPrets : [],
                  }))
                  answer('autresPrets')
                }}
              />
              {data.asks.autresPrets ? (
                <RepeatableGroup<AutrePret>
                  items={data.autresPrets}
                  onChange={(items) => patch((prev) => ({ ...prev, autresPrets: items }))}
                  makeEmpty={() => ({ montant: 0, libelle: null })}
                  labels={{ done: tc('done'), add: tc('add'), edit: tc('edit'), remove: tc('remove') }}
                  renderSummary={(item) => (
                    <span>
                      {item.libelle ?? t('autresPrets.short')} ·{' '}
                      <span className="text-data">{formatCHF(item.montant)}</span>
                    </span>
                  )}
                  renderForm={(item, update) => (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t('autresPrets.montant')}</Label>
                        <AmountInput
                          id="w-pret-montant"
                          value={item.montant || null}
                          onChange={(v) => update({ montant: v ?? 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('autresPrets.libelle')}</Label>
                        <Input
                          className="h-12"
                          value={item.libelle ?? ''}
                          onChange={(e) => update({ libelle: e.target.value || null })}
                        />
                      </div>
                    </div>
                  )}
                />
              ) : null}
            </div>
          </QuestionCard>
        ) : null
      ) : /* §1.4 Hypothèques existantes (renouvellement) */
      visible('tranchesExistantes') ? (
        <QuestionCard
          id="tranchesExistantes"
          title={t('tranchesExistantes.title')}
          subtitle={t('tranchesExistantes.subtitle')}
          info={t('tranchesExistantes.info')}
          status={statusOf('tranchesExistantes')}
          highlight={highlightKey === 'tranchesExistantes'}
        >
          <RepeatableGroup<Tranche>
            items={data.tranchesExistantes}
            onChange={(items) => {
              patch((prev) => ({ ...prev, tranchesExistantes: items }))
              answer('tranchesExistantes')
            }}
            makeEmpty={() => ({
              lenderId: null,
              lenderNom: null,
              montant: 0,
              taux: null,
              produit: 'FIXE',
              echeance: null,
            })}
            labels={{
              done: tc('done'),
              add: tc('add'),
              edit: tc('edit'),
              remove: tc('remove'),
              totalLabel: t('tranchesExistantes.totalLabel'),
            }}
            total={formatCHF(data.tranchesExistantes.reduce((s, x) => s + x.montant, 0))}
            renderSummary={(item) => (
              <span className="flex items-center gap-2">
                <CalendarClock className="text-ink-400 size-4 shrink-0" />
                <span className="truncate">
                  {item.lenderNom ?? '—'} ·{' '}
                  <span className="text-data">{formatCHF(item.montant)}</span>
                  {item.echeance ? (
                    <span className="text-ink-500"> · {isoToFr(item.echeance)}</span>
                  ) : null}
                </span>
              </span>
            )}
            renderForm={(item, update) => (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('tranchesExistantes.lender')}</Label>
                  <AutocompleteField
                    id="w-tr-lender"
                    endpoint="/api/lenders"
                    placeholder={t('tranchesExistantes.lenderPlaceholder')}
                    value={item.lenderNom ?? ''}
                    onTextChange={(text) => update({ lenderId: null, lenderNom: text || null })}
                    onSelect={(hit) => {
                      const p = hit.payload as { id: string; nom: string }
                      update({ lenderId: p.id, lenderNom: p.nom })
                    }}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('tranchesExistantes.montant')}</Label>
                    <AmountInput
                      id="w-tr-montant"
                      value={item.montant || null}
                      onChange={(v) => update({ montant: v ?? 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tranchesExistantes.taux')}</Label>
                    <Input
                      inputMode="decimal"
                      className="h-12"
                      placeholder="1,45"
                      value={item.taux != null ? String(item.taux).replace('.', ',') : ''}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(',', '.'))
                        update({ taux: Number.isFinite(n) && e.target.value ? n : null })
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('tranchesExistantes.produit')}</Label>
                    <Select
                      value={item.produit}
                      onValueChange={(v) => update({ produit: v as Tranche['produit'] })}
                    >
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['SARON', 'VARIABLE', 'FIXE'] as const).map((p) => (
                          <SelectItem key={p} value={p}>
                            {t(`tranchesExistantes.produits.${p}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tranchesExistantes.echeance')}</Label>
                    <DateInput
                      id="w-tr-echeance"
                      value={isoToFr(item.echeance)}
                      errorLabel={tc('invalidDate')}
                      onChange={(fr) => update({ echeance: frToIso(fr) })}
                    />
                  </div>
                </div>
              </div>
            )}
          />
        </QuestionCard>
      ) : null}

      {/* §1.6 Autres biens en propriété */}
      {visible('autresBiens') ? (
        <QuestionCard
          id="autresBiens"
          title={t('autresBiens.title')}
          status={statusOf('autresBiens')}
          highlight={highlightKey === 'autresBiens'}
        >
          <div className="space-y-3">
            <YesNoToggle
              idBase="w-autres-biens"
              yesLabel={tc('yes')}
              noLabel={tc('no')}
              value={data.asks.autresBiens ?? null}
              onChange={(yes) => {
                patch((prev) => ({
                  ...prev,
                  asks: { ...prev.asks, autresBiens: yes },
                  autresBiens: yes ? prev.autresBiens : [],
                }))
                answer('autresBiens')
              }}
            />
            {data.asks.autresBiens ? (
              <RepeatableGroup<AutreBienData>
                items={data.autresBiens}
                onChange={(items) => patch((prev) => ({ ...prev, autresBiens: items }))}
                makeEmpty={() => ({
                  usage: null,
                  locatifUsage: null,
                  enSuisse: null,
                  genre: null,
                  annexe: null,
                  valeur: null,
                  aHypotheque: null,
                  hypothequeRestante: null,
                  amortissementRequis: null,
                  amortissementAnnuel: null,
                  revenuLocatifAnnuel: null,
                  type: null,
                })}
                labels={{ done: tc('done'), add: tc('add'), edit: tc('edit'), remove: tc('remove') }}
                renderSummary={(item) => (
                  <span>
                    {item.genre ? t(`autresBiens.genreOptions.${item.genre}`) : '—'}
                    {item.valeur ? (
                      <span className="text-data text-ink-500"> · {formatCHF(item.valeur)}</span>
                    ) : null}
                  </span>
                )}
                renderForm={(item, update) => (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>{t('autresBiens.usage')}</Label>
                      <Select
                        value={item.usage ?? undefined}
                        onValueChange={(v) => update({ usage: v as AutreBienData['usage'] })}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['OCCUPE', 'VACANCES', 'LOUE', 'PARTIEL'] as const).map((v) => (
                            <SelectItem key={v} value={v}>
                              {t(`autresBiens.usageOptions.${v}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {item.usage === 'LOUE' || item.usage === 'PARTIEL' ? (
                      <div className="space-y-1.5">
                        <Label>{t('autresBiens.locatifUsage')}</Label>
                        <Select
                          value={item.locatifUsage ?? undefined}
                          onValueChange={(v) =>
                            update({ locatifUsage: v as AutreBienData['locatifUsage'] })
                          }
                        >
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['RESIDENTIEL', 'MIXTE', 'COMMERCIAL'] as const).map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`autresBiens.locatifUsageOptions.${v}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label>{t('autresBiens.enSuisse')}</Label>
                      <YesNoToggle
                        idBase="w-ab-suisse"
                        yesLabel={tc('yes')}
                        noLabel={tc('no')}
                        value={item.enSuisse ?? null}
                        onChange={(v) => update({ enSuisse: v })}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t('autresBiens.genre')}</Label>
                        <Select
                          value={item.genre ?? undefined}
                          onValueChange={(v) => update({ genre: v as AutreBienData['genre'] })}
                        >
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              ['MAISON', 'APPARTEMENT', 'MITOYENNE', 'IMMEUBLE', 'PLUSIEURS_APPARTEMENTS'] as const
                            ).map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`autresBiens.genreOptions.${v}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('autresBiens.valeur')}</Label>
                        <AmountInput
                          id="w-ab-valeur"
                          value={item.valeur ?? null}
                          onChange={(v) => update({ valeur: v })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('autresBiens.annexe')}</Label>
                      <YesNoToggle
                        idBase="w-ab-annexe"
                        yesLabel={tc('yes')}
                        noLabel={tc('no')}
                        value={item.annexe ?? null}
                        onChange={(v) => update({ annexe: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('autresBiens.aHypotheque')}</Label>
                      <YesNoToggle
                        idBase="w-ab-hypo"
                        yesLabel={tc('yes')}
                        noLabel={tc('no')}
                        value={item.aHypotheque ?? null}
                        onChange={(v) =>
                          update({
                            aHypotheque: v,
                            hypothequeRestante: v ? item.hypothequeRestante : null,
                            amortissementRequis: v ? item.amortissementRequis : null,
                            amortissementAnnuel: v ? item.amortissementAnnuel : null,
                          })
                        }
                      />
                    </div>
                    {item.aHypotheque ? (
                      <>
                        <div className="space-y-1.5">
                          <Label>{t('autresBiens.totalHypotheques')}</Label>
                          <AmountInput
                            id="w-ab-hypo-total"
                            value={item.hypothequeRestante ?? null}
                            onChange={(v) => update({ hypothequeRestante: v })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('autresBiens.amortissementRequis')}</Label>
                          <YesNoToggle
                            idBase="w-ab-amort"
                            yesLabel={tc('yes')}
                            noLabel={tc('no')}
                            value={item.amortissementRequis ?? null}
                            onChange={(v) =>
                              update({
                                amortissementRequis: v,
                                amortissementAnnuel: v ? item.amortissementAnnuel : null,
                              })
                            }
                          />
                        </div>
                        {item.amortissementRequis ? (
                          <div className="space-y-1.5">
                            <Label>{t('autresBiens.amortissementAnnuel')}</Label>
                            <AmountInput
                              id="w-ab-amort-montant"
                              value={item.amortissementAnnuel ?? null}
                              onChange={(v) => update({ amortissementAnnuel: v })}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label>{t('autresBiens.revenuLocatif')}</Label>
                      <AmountInput
                        id="w-ab-loyer"
                        value={item.revenuLocatifAnnuel ?? null}
                        onChange={(v) => update({ revenuLocatifAnnuel: v })}
                      />
                    </div>
                  </div>
                )}
              />
            ) : null}
          </div>
        </QuestionCard>
      ) : null}
    </div>
  )
}
