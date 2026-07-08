'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarClock, Phone } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { formatCHF } from '@/lib/format'
import type { DossierData } from '@/lib/dossier/schema'
import { QuestionCard, type QuestionStatus } from '@/components/wizard/question-card'
import { OptionList, OptionListIllustrated } from '@/components/wizard/option-list'
import { AmountInput, Counter, DateInput, YearInput, YesNoToggle } from '@/components/wizard/inputs'
import { NotchedSlider, SplitSlider } from '@/components/wizard/sliders'
import { AutocompleteField } from '@/components/wizard/autocomplete'
import { MapConfirm } from '@/components/wizard/map-confirm'
import { RepeatableGroup } from '@/components/wizard/repeatable-group'
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

type Bien = DossierData['bien']
type Tranche = DossierData['tranchesExistantes'][number]
type AutreBien = DossierData['autresBiens'][number]

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

const ETAT_NOTCHES = (labels: { tresBon: string; bon: string; moyen: string; mauvais: string }) => [
  { value: 1, label: labels.tresBon },
  { value: 2 },
  { value: 3, label: labels.bon },
  { value: 4 },
  { value: 5, label: labels.moyen },
  { value: 6 },
  { value: 7, label: labels.mauvais },
]

// ─── Section 1 · Le bien — progressive disclosure ──────────────────────
export function BienSection({
  funnel,
  data,
  setBien,
  patch,
  highlightKey,
  onAnswered,
  complex,
}: {
  funnel: Funnel
  data: DossierData
  setBien: <K extends keyof Bien>(key: K, value: Bien[K]) => void
  patch: (updater: (prev: DossierData) => DossierData) => void
  highlightKey: string | null
  onAnswered: (questionKey: string) => void
  complex: boolean
}) {
  const t = useTranslations('wizard.questions')
  const tc = useTranslations('wizard.common')
  const tx = useTranslations('wizard.complexCard')
  const b = data.bien
  const [ecoAsk, setEcoAsk] = useState<boolean | null>(b.labelEco ? true : null)
  const [renovAsk, setRenovAsk] = useState<boolean | null>(b.anneeRenovation != null ? true : null)

  const isMaison = b.type === 'MAISON' || b.type === 'MAISON_MITOYENNE'

  // Ordre des questions + prédicat « répondue » (pilote l'apparition en fondu).
  const steps = useMemo(() => {
    const list: Array<{ key: string; done: boolean }> = [
      { key: 'usage', done: b.usage != null },
      { key: 'typeBien', done: b.type != null },
    ]
    if (isMaison) list.push({ key: 'position', done: b.position != null })
    list.push(
      { key: 'adresse', done: Boolean(b.npa && b.localite && b.geoConfirme) },
      { key: 'anneeConstruction', done: b.anneeConstruction != null && b.anneeConstruction >= 1850 },
      { key: 'pieces', done: b.pieces != null },
      { key: 'sallesEau', done: b.sallesEau != null },
      {
        key: 'etatBien',
        done:
          b.etatCuisine != null &&
          b.etatSallesBains != null &&
          b.etatInterieur != null &&
          b.etatExterieur != null,
      },
      { key: 'chauffage', done: b.chauffage != null },
      { key: 'labelEco', done: ecoAsk === false || Boolean(b.labelEco) },
      {
        key: 'casSpeciaux',
        done: b.servitudes != null && b.zoneAgricole != null && b.nouvelleConstruction != null,
      }
    )
    if (funnel === 'ACHAT') {
      list.push(
        { key: 'prixAchat', done: b.prixAchat != null },
        { key: 'fondsPropres', done: b.fondsPropres != null }
      )
    } else {
      list.push(
        { key: 'valeur', done: b.valeur != null },
        { key: 'tranchesExistantes', done: data.tranchesExistantes.length > 0 }
      )
    }
    list.push({ key: 'autresBiens', done: true }) // optionnelle
    return list
  }, [b, data.tranchesExistantes.length, ecoAsk, funnel, isMaison])

  // Une question est visible si toutes les précédentes sont répondues.
  const visibleUpTo = useMemo(() => {
    let i = 0
    while (i < steps.length && steps[i]!.done) i++
    return i // index de la première non répondue (visible aussi)
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

  const etatLabels = {
    tresBon: t('etatBien.scale.tresBon'),
    bon: t('etatBien.scale.bon'),
    moyen: t('etatBien.scale.moyen'),
    mauvais: t('etatBien.scale.mauvais'),
  }

  return (
    <div className="space-y-4">
      {/* 1.1 Usage */}
      <QuestionCard
        id="usage"
        title={t('usage.title')}
        subtitle={t('usage.subtitle')}
        info={t('usage.info')}
        status={statusOf('usage')}
        highlight={highlightKey === 'usage'}
      >
        <OptionList
          value={b.usage ?? null}
          options={[
            { value: 'RESIDENCE_PRINCIPALE', label: t('usage.options.RESIDENCE_PRINCIPALE') },
            {
              value: 'RESIDENCE_SECONDAIRE',
              label: t('usage.options.RESIDENCE_SECONDAIRE'),
              sublabel: t('usage.options.RESIDENCE_SECONDAIRE_sub'),
            },
            {
              value: 'RENDEMENT',
              label: t('usage.options.RENDEMENT'),
              sublabel: t('usage.options.RENDEMENT_sub'),
            },
          ]}
          onSelect={(v) => {
            setBien('usage', v)
            answer('usage')
          }}
        />
      </QuestionCard>

      {/* 1.2 Type de bien (illustré) */}
      {visible('typeBien') ? (
        <QuestionCard
          id="typeBien"
          title={t('typeBien.title')}
          subtitle={t('typeBien.subtitle')}
          info={t('typeBien.info')}
          status={statusOf('typeBien')}
          highlight={highlightKey === 'typeBien'}
        >
          <OptionListIllustrated
            value={b.type ?? null}
            options={[
              { value: 'MAISON', label: t('typeBien.options.MAISON'), icon: 'maison' },
              {
                value: 'APPARTEMENT_PPE',
                label: t('typeBien.options.APPARTEMENT_PPE'),
                sublabel: t('typeBien.options.APPARTEMENT_PPE_sub'),
                icon: 'appartement-ppe',
              },
              {
                value: 'MAISON_MITOYENNE',
                label: t('typeBien.options.MAISON_MITOYENNE'),
                icon: 'maison-mitoyenne',
              },
              {
                value: 'IMMEUBLE',
                label: t('typeBien.options.IMMEUBLE'),
                sublabel: t('typeBien.options.IMMEUBLE_sub'),
                icon: 'immeuble',
              },
            ]}
            onSelect={(v) => {
              setBien('type', v)
              answer('typeBien')
            }}
          />
        </QuestionCard>
      ) : null}

      {/* 1.2b Position (maisons) */}
      {isMaison && visible('position') ? (
        <QuestionCard
          id="position"
          title={t('position.title')}
          subtitle={t('position.subtitle')}
          status={statusOf('position')}
          highlight={highlightKey === 'position'}
        >
          <OptionListIllustrated
            value={b.position ?? null}
            options={[
              {
                value: 'INDIVIDUELLE',
                label: t('position.options.INDIVIDUELLE'),
                icon: 'position-individuelle',
              },
              { value: 'JUMELEE', label: t('position.options.JUMELEE'), icon: 'position-jumelee' },
              {
                value: 'MITOYENNE_CENTRALE',
                label: t('position.options.MITOYENNE_CENTRALE'),
                icon: 'position-mitoyenne-centrale',
              },
              {
                value: 'MITOYENNE_ANGLE',
                label: t('position.options.MITOYENNE_ANGLE'),
                icon: 'position-mitoyenne-angle',
              },
            ]}
            onSelect={(v) => {
              setBien('position', v)
              answer('position')
            }}
          />
        </QuestionCard>
      ) : null}

      {/* 1.3 Adresse + carte */}
      {visible('adresse') ? (
        <QuestionCard
          id="adresse"
          title={t('adresse.title')}
          subtitle={t('adresse.subtitle')}
          info={t('adresse.info')}
          status={statusOf('adresse')}
          highlight={highlightKey === 'adresse'}
        >
          <div className="space-y-3">
            <AutocompleteField
              id="w-npa"
              endpoint="/api/localities"
              placeholder={t('adresse.npaPlaceholder')}
              value={
                b.npa && b.localite
                  ? `${b.canton ? `${b.canton}-` : ''}${b.npa} ${b.localite}`
                  : ''
              }
              onSelect={(item) => {
                const p = item.payload as { npa: string; localite: string; canton: string }
                patch((prev) => ({
                  ...prev,
                  bien: {
                    ...prev.bien,
                    npa: p.npa,
                    localite: p.localite,
                    canton: p.canton,
                    geoConfirme: false,
                  },
                }))
              }}
            />
            <Input
              aria-label={t('adresse.ruePlaceholder')}
              placeholder={t('adresse.ruePlaceholder')}
              className="h-12"
              value={b.rue ?? ''}
              onChange={(e) => setBien('rue', e.target.value || null)}
            />
            {b.npa && b.localite ? (
              <MapConfirm
                address={`${b.rue ?? ''} ${b.npa} ${b.localite}`.trim()}
                confirmed={b.geoConfirme ?? false}
                onGeocoded={(lat, lng) => {
                  patch((prev) =>
                    prev.bien.lat === lat && prev.bien.lng === lng
                      ? prev
                      : { ...prev, bien: { ...prev.bien, lat, lng } }
                  )
                }}
                onConfirm={(ok) => {
                  setBien('geoConfirme', ok)
                  if (ok) answer('adresse')
                }}
                labels={{
                  confirm: t('adresse.mapConfirm'),
                  wrong: t('adresse.mapWrong'),
                  loading: t('adresse.mapLoading'),
                  unavailable: t('adresse.mapUnavailable'),
                }}
              />
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* 1.4 Année de construction + rénovation */}
      {visible('anneeConstruction') ? (
        <QuestionCard
          id="anneeConstruction"
          title={t('anneeConstruction.title')}
          status={statusOf('anneeConstruction')}
          highlight={highlightKey === 'anneeConstruction'}
        >
          <div className="space-y-4">
            <YearInput
              id="w-annee"
              value={b.anneeConstruction ?? null}
              errorLabel={tc('invalidYear')}
              onChange={(v) => {
                setBien('anneeConstruction', v)
                if (v && v >= 1850) answer('anneeConstruction')
              }}
            />
            {b.anneeConstruction ? (
              <div className="space-y-2">
                <Label>{t('anneeConstruction.renovationAsk')}</Label>
                <YesNoToggle
                  idBase="w-renov"
                  yesLabel={tc('yes')}
                  noLabel={tc('no')}
                  value={renovAsk}
                  onChange={(yes) => {
                    setRenovAsk(yes)
                    if (!yes) setBien('anneeRenovation', null)
                  }}
                />
                {renovAsk ? (
                  <YearInput
                    id="w-renov-annee"
                    value={b.anneeRenovation ?? null}
                    errorLabel={tc('invalidYear')}
                    onChange={(v) => setBien('anneeRenovation', v)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* 1.5 Pièces + salles d'eau */}
      {visible('pieces') ? (
        <QuestionCard
          id="pieces"
          title={t('pieces.title')}
          subtitle={t('pieces.subtitle')}
          status={statusOf('pieces')}
          highlight={highlightKey === 'pieces'}
        >
          <Counter
            id="w-pieces"
            label={t('pieces.short')}
            value={b.pieces ?? 3.5}
            min={1}
            max={20}
            step={0.5}
            decrementLabel={tc('decrement')}
            incrementLabel={tc('increment')}
            onChange={(v) => {
              setBien('pieces', v)
              answer('pieces')
            }}
          />
        </QuestionCard>
      ) : null}

      {visible('sallesEau') ? (
        <QuestionCard
          id="sallesEau"
          title={t('sallesEau.title')}
          status={statusOf('sallesEau')}
          highlight={highlightKey === 'sallesEau'}
        >
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                ['baignoires', 'baignoire', t('sallesEau.baignoire')],
                ['douches', 'douche', t('sallesEau.douche')],
                ['wc', 'wc', t('sallesEau.wc')],
              ] as const
            ).map(([key, icon, label]) => (
              <Counter
                key={key}
                id={`w-se-${key}`}
                label={label}
                icon={icon}
                value={b.sallesEau?.[key] ?? 0}
                min={0}
                max={8}
                decrementLabel={tc('decrement')}
                incrementLabel={tc('increment')}
                onChange={(v) => {
                  // Mise à jour fonctionnelle : les trois compteurs partagent
                  // le même objet, un snapshot périmé écraserait les voisins.
                  patch((prev) => ({
                    ...prev,
                    bien: {
                      ...prev.bien,
                      sallesEau: {
                        baignoires: prev.bien.sallesEau?.baignoires ?? 0,
                        douches: prev.bien.sallesEau?.douches ?? 0,
                        wc: prev.bien.sallesEau?.wc ?? 0,
                        [key]: v,
                      },
                    },
                  }))
                  answer('sallesEau')
                }}
              />
            ))}
          </div>
        </QuestionCard>
      ) : null}

      {/* 1.6 État du bien : 4 curseurs à crans */}
      {visible('etatBien') ? (
        <QuestionCard
          id="etatBien"
          title={t('etatBien.title')}
          subtitle={t('etatBien.subtitle')}
          status={statusOf('etatBien')}
          highlight={highlightKey === 'etatBien'}
        >
          <div className="space-y-6">
            {(
              [
                ['etatCuisine', t('etatBien.cuisine')],
                ['etatSallesBains', t('etatBien.sallesBains')],
                ['etatInterieur', t('etatBien.interieur')],
                ['etatExterieur', t('etatBien.exterieur')],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="mb-2 block">{label}</Label>
                <NotchedSlider
                  id={`w-${key}`}
                  ariaLabel={label}
                  notches={ETAT_NOTCHES(etatLabels)}
                  value={b[key] ?? null}
                  onChange={(v) => {
                    setBien(key, v)
                    answer('etatBien')
                  }}
                />
              </div>
            ))}
          </div>
        </QuestionCard>
      ) : null}

      {/* 1.7 Chauffage + label éco */}
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
              ['pompe-a-chaleur', 'gaz', 'mazout', 'pellets', 'electrique', 'reseau', 'autre'] as const
            ).map((v) => ({ value: v, label: t(`chauffage.options.${v}`) }))}
            onSelect={(v) => {
              setBien('chauffage', v)
              answer('chauffage')
            }}
          />
        </QuestionCard>
      ) : null}

      {visible('labelEco') ? (
        <QuestionCard
          id="labelEco"
          title={t('labelEco.title')}
          info={t('labelEco.info')}
          status={statusOf('labelEco')}
          highlight={highlightKey === 'labelEco'}
        >
          <div className="space-y-3">
            <YesNoToggle
              idBase="w-eco"
              yesLabel={tc('yes')}
              noLabel={tc('no')}
              value={ecoAsk}
              onChange={(yes) => {
                setEcoAsk(yes)
                if (!yes) setBien('labelEco', null)
                answer('labelEco')
              }}
            />
            {ecoAsk ? (
              <div className="space-y-2">
                <Label>{t('labelEco.which')}</Label>
                <OptionList<string>
                  value={b.labelEco ?? null}
                  options={(['Minergie', 'Minergie-P', 'CECB-A', 'CECB-B', 'autre'] as const).map(
                    (v) => ({ value: v, label: t(`labelEco.options.${v}`) })
                  )}
                  onSelect={(v) => setBien('labelEco', v)}
                />
              </div>
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* 1.8 Cas spéciaux */}
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
                ['servitudes', t('casSpeciaux.servitudes')],
                ['zoneAgricole', t('casSpeciaux.zoneAgricole')],
                ['nouvelleConstruction', t('casSpeciaux.nouvelleConstruction')],
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
          </div>
        </QuestionCard>
      ) : null}

      {/* Carte conseiller (cas complexe) — ne bloque jamais */}
      {complex ? (
        <div className="border-ambre-500 bg-ambre-50 animate-in fade-in rounded-xl border p-5 duration-300">
          <h3 className="font-display flex items-center gap-2 font-semibold">
            <Phone className="text-ambre-600 size-4" /> {tx('title')}
          </h3>
          <p className="text-ink-700 mt-1 text-sm leading-relaxed">{tx('body')}</p>
          <Button size="sm" className="mt-3" asChild>
            <a href="#offres">{tx('cta')}</a>
          </Button>
        </div>
      ) : null}

      {/* 1.9 Valeur (renouvellement) / prix + fonds propres (achat) */}
      {funnel === 'ACHAT' ? (
        <>
          {visible('prixAchat') ? (
            <QuestionCard
              id="prixAchat"
              title={t('prixAchat.title')}
              status={statusOf('prixAchat')}
              highlight={highlightKey === 'prixAchat'}
            >
              <AmountInput
                id="w-prix"
                value={b.prixAchat ?? null}
                onChange={(v) => {
                  setBien('prixAchat', v)
                  if (v) answer('prixAchat')
                }}
              />
            </QuestionCard>
          ) : null}
          {visible('fondsPropres') && b.prixAchat ? (
            <QuestionCard
              id="fondsPropres"
              title={t('fondsPropres.title')}
              subtitle={t('fondsPropres.subtitle')}
              status={statusOf('fondsPropres')}
              highlight={highlightKey === 'fondsPropres'}
            >
              <SplitSlider
                total={b.prixAchat}
                mortgage={data.montantTotal ?? Math.round((b.prixAchat * 0.8) / 5000) * 5000}
                mortgageLabel={t('fondsPropres.mortgageLabel')}
                ownFundsLabel={t('fondsPropres.ownFundsLabel')}
                totalLabel={t('fondsPropres.totalLabel')}
                onChange={(mortgage) => {
                  patch((prev) => ({
                    ...prev,
                    montantTotal: mortgage,
                    bien: { ...prev.bien, fondsPropres: (b.prixAchat ?? 0) - mortgage },
                  }))
                  answer('fondsPropres')
                }}
              />
            </QuestionCard>
          ) : null}
        </>
      ) : (
        <>
          {visible('valeur') ? (
            <QuestionCard
              id="valeur"
              title={t('valeur.title')}
              subtitle={t('valeur.subtitle')}
              info={t('valeur.info')}
              status={statusOf('valeur')}
              highlight={highlightKey === 'valeur'}
            >
              <AmountInput
                id="w-valeur"
                value={b.valeur ?? null}
                onChange={(v) => {
                  setBien('valeur', v)
                  if (v) answer('valeur')
                }}
              />
            </QuestionCard>
          ) : null}

          {/* 1.10a Hypothèques existantes */}
          {visible('tranchesExistantes') ? (
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
                      {item.lenderNom ?? '—'} · <span className="text-data">{formatCHF(item.montant)}</span>
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
                            {(['FIXE', 'SARON', 'VARIABLE'] as const).map((p) => (
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
        </>
      )}

      {/* 1.11 Autres biens */}
      {visible('autresBiens') ? (
        <QuestionCard
          id="autresBiens"
          title={t('autresBiens.title')}
          status={data.autresBiens.length > 0 ? 'complete' : 'untouched'}
          highlight={highlightKey === 'autresBiens'}
        >
          <RepeatableGroup<AutreBien>
            items={data.autresBiens}
            onChange={(items) => patch((prev) => ({ ...prev, autresBiens: items }))}
            makeEmpty={() => ({
              type: null,
              valeur: null,
              hypothequeRestante: null,
              revenuLocatifAnnuel: null,
            })}
            labels={{ done: tc('done'), add: tc('add'), edit: tc('edit'), remove: tc('remove') }}
            renderSummary={(item) => (
              <span>
                {item.type ?? '—'}
                {item.valeur ? (
                  <span className="text-data text-ink-500"> · {formatCHF(item.valeur)}</span>
                ) : null}
              </span>
            )}
            renderForm={(item, update) => (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('autresBiens.type')}</Label>
                  <Input
                    className="h-12"
                    placeholder={t('autresBiens.typePlaceholder')}
                    value={item.type ?? ''}
                    onChange={(e) => update({ type: e.target.value || null })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>{t('autresBiens.valeur')}</Label>
                    <AmountInput
                      id="w-ab-valeur"
                      value={item.valeur ?? null}
                      onChange={(v) => update({ valeur: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('autresBiens.hypotheque')}</Label>
                    <AmountInput
                      id="w-ab-hypo"
                      value={item.hypothequeRestante ?? null}
                      onChange={(v) => update({ hypothequeRestante: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('autresBiens.revenuLocatif')}</Label>
                    <AmountInput
                      id="w-ab-loyer"
                      value={item.revenuLocatifAnnuel ?? null}
                      onChange={(v) => update({ revenuLocatifAnnuel: v })}
                    />
                  </div>
                </div>
              </div>
            )}
          />
        </QuestionCard>
      ) : null}
    </div>
  )
}
