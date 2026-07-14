'use client'

import { useTranslations } from 'next-intl'
import { UserRound, X } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { formatCHF } from '@/lib/format'
import type { DossierData, EmprunteurData } from '@/lib/dossier/schema'
import { QuestionCard, type QuestionStatus } from '@/components/wizard/question-card'
import { OptionList } from '@/components/wizard/option-list'
import { AmountInput, YearInput, YesNoToggle } from '@/components/wizard/inputs'
import { NotchedSlider } from '@/components/wizard/sliders'
import { RepeatableGroup } from '@/components/wizard/repeatable-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Revenu = EmprunteurData['revenus'][number]
type Charge = EmprunteurData['charges'][number]
type Avoir = EmprunteurData['avoirs'][number]
type Poursuite = EmprunteurData['poursuites'][number]

export function emptyEmprunteur(ordre: number): EmprunteurData {
  return { ordre, revenus: [], charges: [], avoirs: [], poursuites: [] }
}

const CURRENT_YEAR = new Date().getFullYear()

// ─── Section 2 · L'emprunteur — arbre de docs/formulaire-complet.md §2 ─
export function EmprunteursSection({
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

  // Patch fonctionnel d'un emprunteur par ordre (jamais de snapshot périmé).
  function patchEmp(ordre: number, updater: (e: EmprunteurData) => EmprunteurData) {
    patch((prev) => ({
      ...prev,
      emprunteurs: prev.emprunteurs.map((e) => (e.ordre === ordre ? updater(e) : e)),
    }))
  }

  function setCount(plusieurs: boolean) {
    patch((prev) => {
      let emprunteurs = prev.emprunteurs
      if (emprunteurs.length === 0) emprunteurs = [emptyEmprunteur(1)]
      if (plusieurs && emprunteurs.length === 1) emprunteurs = [...emprunteurs, emptyEmprunteur(2)]
      if (!plusieurs) emprunteurs = emprunteurs.slice(0, 1)
      return { ...prev, asks: { ...prev.asks, plusieursEmprunteurs: plusieurs }, emprunteurs }
    })
  }

  function addEmprunteur() {
    patch((prev) =>
      prev.emprunteurs.length >= 4
        ? prev
        : { ...prev, emprunteurs: [...prev.emprunteurs, emptyEmprunteur(prev.emprunteurs.length + 1)] }
    )
  }

  function removeEmprunteur(ordre: number) {
    patch((prev) => ({
      ...prev,
      emprunteurs: prev.emprunteurs
        .filter((e) => e.ordre !== ordre)
        .map((e, i) => ({ ...e, ordre: i + 1 })),
    }))
  }

  const countAnswered = data.asks.plusieursEmprunteurs != null

  return (
    <div className="space-y-8">
      {/* §2.0 Qui sera emprunteur ? */}
      <QuestionCard
        id="nombreEmprunteurs"
        title={t('nombreEmprunteurs.title')}
        subtitle={t('nombreEmprunteurs.subtitle')}
        status={countAnswered ? 'complete' : 'required'}
        highlight={highlightKey === 'nombreEmprunteurs'}
      >
        <OptionList<'UNE' | 'PLUSIEURS'>
          value={
            data.asks.plusieursEmprunteurs == null
              ? null
              : data.asks.plusieursEmprunteurs
                ? 'PLUSIEURS'
                : 'UNE'
          }
          options={[
            { value: 'UNE', label: t('nombreEmprunteurs.options.UNE') },
            { value: 'PLUSIEURS', label: t('nombreEmprunteurs.options.PLUSIEURS') },
          ]}
          onSelect={(v) => setCount(v === 'PLUSIEURS')}
        />
      </QuestionCard>

      {countAnswered
        ? data.emprunteurs.map((emp) => (
            <EmprunteurBlock
              key={emp.ordre}
              funnel={funnel}
              emp={emp}
              count={data.emprunteurs.length}
              patchEmp={(updater) => patchEmp(emp.ordre, updater)}
              onRemove={() => removeEmprunteur(emp.ordre)}
              highlightKey={emp.ordre === 1 ? highlightKey : null}
            />
          ))
        : null}

      {/* §2.6 Y a-t-il d'autres emprunteurs ? */}
      {countAnswered && data.asks.plusieursEmprunteurs && data.emprunteurs.length < 4 ? (
        <div className="border-line rounded-xl border bg-white p-5">
          <Label className="mb-2 block">{t('addEmprunteur')}</Label>
          <YesNoToggle
            idBase="w-plus-emprunteurs"
            yesLabel={tc('yes')}
            noLabel={tc('no')}
            value={null}
            onChange={(yes) => {
              if (yes) addEmprunteur()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function EmprunteurBlock({
  funnel,
  emp,
  count,
  patchEmp,
  onRemove,
  highlightKey,
}: {
  funnel: Funnel
  emp: EmprunteurData
  count: number
  patchEmp: (updater: (e: EmprunteurData) => EmprunteurData) => void
  onRemove: () => void
  highlightKey: string | null
}) {
  const t = useTranslations('wizard.questions')
  const tc = useTranslations('wizard.common')
  const suffix = count > 1 ? `-${emp.ordre}` : ''

  const set = <K extends keyof EmprunteurData>(key: K, value: EmprunteurData[K]) =>
    patchEmp((e) => ({ ...e, [key]: value }))

  const suisse = emp.nationalite === 'SUISSE' || emp.nationalite === 'Suisse'

  // Prédicats — mêmes règles que lib/dossier/completeness.ts.
  const identiteDone =
    emp.nationalite != null &&
    (suisse || (emp.permis != null && emp.fatca != null)) &&
    emp.residenceFuture != null &&
    emp.anneeNaissance != null &&
    (emp.ordre !== 1 || (emp.email != null && emp.email.includes('@')))
  const revenuComplet = (r: Revenu) =>
    r.montantAnnuel > 0 &&
    (r.categorie != null || r.type != null) &&
    (r.categorie !== 'ACTIVITE' || r.typeActivite != null) &&
    (r.categorie !== 'RENTE' || r.typeRente != null) &&
    (r.categorie !== 'AUTRE' || r.typeAutre != null)
  const revenusDone =
    emp.aRevenu != null && (!emp.aRevenu || (emp.revenus.length > 0 && emp.revenus.every(revenuComplet)))
  const avoirsDone = emp.aAvoirs != null && (!emp.aAvoirs || emp.avoirs.length > 0)
  const chargesDone = emp.aCharges != null && (!emp.aCharges || emp.charges.length > 0)
  const poursuitesDone =
    emp.aPoursuites != null &&
    (!emp.aPoursuites || (emp.poursuites.length > 0 && emp.poursuites.every((p) => p.origine != null)))

  const order: Array<[string, boolean]> = [
    ['identite', identiteDone],
    ['revenus', revenusDone],
    ['avoirs', avoirsDone],
    ['charges', chargesDone],
    ['poursuites', poursuitesDone],
  ]
  let firstOpen = 0
  while (firstOpen < order.length && order[firstOpen]![1]) firstOpen++
  const visible = (key: string) => order.findIndex(([k]) => k === key) <= firstOpen
  const statusOf = (key: string): QuestionStatus => {
    const index = order.findIndex(([k]) => k === key)
    if (order[index]![1]) return 'complete'
    return index === firstOpen ? 'required' : 'untouched'
  }

  const totalRevenus = emp.revenus.reduce((s, r) => s + r.montantAnnuel, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-ink-700 flex items-center gap-2 text-sm font-semibold tracking-[0.06em] uppercase">
          <UserRound className="text-pilot-600 size-4" />
          {t('emprunteurTitle', { ordre: emp.ordre })}
        </h2>
        {emp.ordre > 1 ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-ink-400 hover:text-erreur flex items-center gap-1 text-xs"
          >
            <X className="size-3.5" />
            {t('removeEmprunteur')}
          </button>
        ) : null}
      </div>

      {/* §2.1 Données personnelles */}
      <QuestionCard
        id={`emprunteurIdentite${suffix}`}
        title={t('emprunteurIdentite.title')}
        sensitive
        sensitiveLabel={tc('sensitive')}
        status={statusOf('identite')}
        highlight={highlightKey === 'emprunteurIdentite'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('emprunteurIdentite.nationalite')}</Label>
            <OptionList<string>
              value={suisse ? 'SUISSE' : (emp.nationalite ?? null)}
              options={(['SUISSE', 'AUTRE', 'PLUSIEURS'] as const).map((v) => ({
                value: v,
                label: t(`emprunteurIdentite.nationaliteOptions.${v}`),
              }))}
              onSelect={(v) => {
                patchEmp((e) => ({
                  ...e,
                  nationalite: v,
                  permis: v === 'SUISSE' ? null : e.permis,
                  fatca: v === 'SUISSE' ? null : e.fatca,
                }))
              }}
            />
          </div>
          {emp.nationalite && !suisse ? (
            <>
              <div className="space-y-2">
                <Label>{t('emprunteurIdentite.permis')}</Label>
                <OptionList<string>
                  value={emp.permis ?? null}
                  options={(['C', 'B', 'AUTRE'] as const).map((v) => ({
                    value: v,
                    label: t(`emprunteurIdentite.permisOptions.${v}`),
                  }))}
                  onSelect={(v) => set('permis', v)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('emprunteurIdentite.fatca')}</Label>
                <YesNoToggle
                  idBase={`e${emp.ordre}-fatca`}
                  yesLabel={tc('yes')}
                  noLabel={tc('no')}
                  value={emp.fatca ?? null}
                  onChange={(v) => set('fatca', v)}
                />
                <p className="text-ink-500 text-xs leading-relaxed">
                  {t('emprunteurIdentite.fatcaInfo')}
                </p>
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label>{t('emprunteurIdentite.residenceFuture')}</Label>
            <OptionList
              value={emp.residenceFuture ?? null}
              options={(['HABITE_LE_BIEN', 'AUTRE_ADRESSE'] as const).map((v) => ({
                value: v,
                label: t(`emprunteurIdentite.residenceOptions.${v}`),
              }))}
              onSelect={(v) => set('residenceFuture', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`e${emp.ordre}-naissance`}>
              {t('emprunteurIdentite.anneeNaissance')}
            </Label>
            <YearInput
              id={`e${emp.ordre}-naissance`}
              min={1920}
              max={CURRENT_YEAR - 18}
              value={emp.anneeNaissance ?? null}
              errorLabel={tc('invalidYear')}
              onChange={(v) => set('anneeNaissance', v)}
            />
          </div>
          {emp.ordre === 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor={`e${emp.ordre}-email`}>{t('emprunteurIdentite.email')}</Label>
              <Input
                id={`e${emp.ordre}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t('emprunteurIdentite.emailPlaceholder')}
                className="h-12"
                value={emp.email ?? ''}
                onChange={(e) => set('email', e.target.value || null)}
              />
              <p className="text-ink-500 text-xs leading-relaxed">
                {t('emprunteurIdentite.emailInfo')}
              </p>
            </div>
          ) : null}
        </div>
      </QuestionCard>

      {/* §2.2 Revenus 🛡 */}
      {visible('revenus') ? (
        <QuestionCard
          id={`emprunteurRevenus${suffix}`}
          title={t('emprunteurRevenus.title')}
          subtitle={t('emprunteurRevenus.subtitle')}
          info={t('emprunteurRevenus.info')}
          sensitive
          sensitiveLabel={tc('sensitive')}
          status={statusOf('revenus')}
          highlight={highlightKey === 'emprunteurRevenus'}
        >
          <div className="space-y-3">
            <YesNoToggle
              idBase={`e${emp.ordre}-a-revenu`}
              yesLabel={tc('yes')}
              noLabel={tc('no')}
              value={emp.aRevenu ?? null}
              onChange={(yes) => {
                patchEmp((e) => ({ ...e, aRevenu: yes, revenus: yes ? e.revenus : [] }))
              }}
            />
            {emp.aRevenu ? (
              <RepeatableGroup<Revenu>
                items={emp.revenus}
                onChange={(items) => set('revenus', items)}
                makeEmpty={() => ({ categorie: 'ACTIVITE', typeActivite: 'SALARIE', montantAnnuel: 0 })}
                labels={{
                  done: tc('done'),
                  add: tc('add'),
                  edit: tc('edit'),
                  remove: tc('remove'),
                  totalLabel: t('emprunteurRevenus.totalLabel'),
                }}
                total={formatCHF(totalRevenus)}
                renderSummary={(item) => (
                  <span>
                    {item.categorie
                      ? item.categorie === 'ACTIVITE' && item.typeActivite
                        ? t(`emprunteurRevenus.typesActivite.${item.typeActivite}`)
                        : item.categorie === 'RENTE' && item.typeRente
                          ? t(`emprunteurRevenus.typesRente.${item.typeRente}`)
                          : item.categorie === 'AUTRE' && item.typeAutre
                            ? t(`emprunteurRevenus.typesAutre.${item.typeAutre}`)
                            : t(`emprunteurRevenus.categories.${item.categorie}`)
                      : '—'}{' '}
                    · <span className="text-data">{formatCHF(item.montantAnnuel)}</span>
                  </span>
                )}
                renderForm={(item, update) => (
                  <RevenuForm item={item} update={update} ordre={emp.ordre} />
                )}
              />
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* §2.3 Avoirs */}
      {visible('avoirs') ? (
        <QuestionCard
          id={`emprunteurAvoirs${suffix}`}
          title={t('emprunteurAvoirs.title')}
          subtitle={t('emprunteurAvoirs.subtitle')}
          sensitive
          sensitiveLabel={tc('sensitive')}
          status={statusOf('avoirs')}
          highlight={highlightKey === 'emprunteurAvoirs'}
        >
          <div className="space-y-3">
            <YesNoToggle
              idBase={`e${emp.ordre}-a-avoirs`}
              yesLabel={tc('yes')}
              noLabel={tc('no')}
              value={emp.aAvoirs ?? null}
              onChange={(yes) => {
                patchEmp((e) => ({ ...e, aAvoirs: yes, avoirs: yes ? e.avoirs : [] }))
              }}
            />
            {emp.aAvoirs ? (
              <RepeatableGroup<Avoir>
                items={emp.avoirs}
                onChange={(items) => set('avoirs', items)}
                makeEmpty={() => ({
                  categorie: 'BANQUE',
                  typeBancaire: 'COMPTE',
                  montant: 0,
                  utilisePourAchat: false,
                })}
                labels={{
                  done: tc('done'),
                  add: tc('add'),
                  edit: tc('edit'),
                  remove: tc('remove'),
                  totalLabel: t('emprunteurAvoirs.totalLabel'),
                }}
                total={formatCHF(emp.avoirs.reduce((s, a) => s + a.montant, 0))}
                renderSummary={(item) => (
                  <span>
                    {item.categorie === 'BANQUE' && item.typeBancaire
                      ? t(`emprunteurAvoirs.typesBancaires.${item.typeBancaire}`)
                      : item.categorie
                        ? t(`emprunteurAvoirs.categories.${item.categorie}`)
                        : '—'}{' '}
                    · <span className="text-data">{formatCHF(item.montant)}</span>
                  </span>
                )}
                renderForm={(item, update) => (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>{t('emprunteurAvoirs.categorie')}</Label>
                      <Select
                        value={item.categorie ?? undefined}
                        onValueChange={(v) =>
                          update({
                            categorie: v as Avoir['categorie'],
                            typeBancaire: v === 'BANQUE' ? (item.typeBancaire ?? 'COMPTE') : null,
                          })
                        }
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['BANQUE', 'ASSURANCE', 'CAISSE_PENSION', 'AUTRE'] as const).map((v) => (
                            <SelectItem key={v} value={v}>
                              {t(`emprunteurAvoirs.categories.${v}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {item.categorie === 'BANQUE' ? (
                      <div className="space-y-1.5">
                        <Label>{t('emprunteurAvoirs.typeBancaire')}</Label>
                        <Select
                          value={item.typeBancaire ?? undefined}
                          onValueChange={(v) => update({ typeBancaire: v as Avoir['typeBancaire'] })}
                        >
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              ['COMPTE', 'TITRES', 'COMPTE_3A', 'TITRES_3A', 'LIBRE_PASSAGE'] as const
                            ).map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`emprunteurAvoirs.typesBancaires.${v}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label>{t('emprunteurAvoirs.montant')}</Label>
                      <AmountInput
                        id={`e${emp.ordre}-avoir-montant`}
                        value={item.montant || null}
                        onChange={(v) => update({ montant: v ?? 0 })}
                      />
                    </div>
                    {funnel === 'ACHAT' ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`e${emp.ordre}-avoir-achat`}
                          checked={item.utilisePourAchat}
                          onCheckedChange={(checked) => update({ utilisePourAchat: checked === true })}
                        />
                        <Label htmlFor={`e${emp.ordre}-avoir-achat`}>
                          {t('emprunteurAvoirs.utilisePourAchat')}
                        </Label>
                      </div>
                    ) : null}
                  </div>
                )}
              />
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* §2.4 Charges régulières */}
      {visible('charges') ? (
        <QuestionCard
          id={`emprunteurCharges${suffix}`}
          title={t('emprunteurCharges.title')}
          subtitle={t('emprunteurCharges.subtitle')}
          info={t('emprunteurCharges.info')}
          status={statusOf('charges')}
          highlight={highlightKey === 'emprunteurCharges'}
        >
          <div className="space-y-3">
            <YesNoToggle
              idBase={`e${emp.ordre}-a-charges`}
              yesLabel={tc('yes')}
              noLabel={tc('no')}
              value={emp.aCharges ?? null}
              onChange={(yes) => {
                patchEmp((e) => ({ ...e, aCharges: yes, charges: yes ? e.charges : [] }))
              }}
            />
            {emp.aCharges ? (
              <RepeatableGroup<Charge>
                items={emp.charges}
                onChange={(items) => set('charges', items)}
                makeEmpty={() => ({ type: 'LEASING', montantAnnuel: 0, leasingFinAnnee: null })}
                labels={{
                  done: tc('done'),
                  add: tc('add'),
                  edit: tc('edit'),
                  remove: tc('remove'),
                  totalLabel: t('emprunteurCharges.totalLabel'),
                }}
                total={formatCHF(emp.charges.reduce((s, c) => s + c.montantAnnuel, 0))}
                renderSummary={(item) => (
                  <span>
                    {t(`emprunteurCharges.types.${item.type === 'CREDIT' || item.type === 'AUTRE' ? 'INTERETS_PRET' : item.type}`)}{' '}
                    · <span className="text-data">{formatCHF(item.montantAnnuel)}</span>
                    {item.leasingFinAnnee ? (
                      <span className="text-ink-500"> · {item.leasingFinAnnee}</span>
                    ) : null}
                  </span>
                )}
                renderForm={(item, update) => (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t('emprunteurCharges.type')}</Label>
                        <Select
                          value={item.type}
                          onValueChange={(v) => update({ type: v as Charge['type'] })}
                        >
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              ['PENSION_ALIMENTAIRE', 'LEASING', 'CREDIT_CONSO', 'INTERETS_PRET'] as const
                            ).map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`emprunteurCharges.types.${v}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('emprunteurCharges.montant')}</Label>
                        <AmountInput
                          id={`e${emp.ordre}-charge-montant`}
                          value={item.montantAnnuel || null}
                          onChange={(v) => update({ montantAnnuel: v ?? 0 })}
                        />
                      </div>
                    </div>
                    {item.type === 'LEASING' ? (
                      <div className="space-y-1.5">
                        <Label>{t('emprunteurCharges.leasingFin')}</Label>
                        <NotchedSlider
                          id={`e${emp.ordre}-leasing-fin`}
                          ariaLabel={t('emprunteurCharges.leasingFin')}
                          notches={[
                            ...[0, 1, 2, 3, 4].map((i) => ({
                              value: CURRENT_YEAR + i,
                              label: String(CURRENT_YEAR + i),
                            })),
                            { value: CURRENT_YEAR + 5, label: t('emprunteurCharges.leasingPlusTard') },
                          ]}
                          value={item.leasingFinAnnee ?? null}
                          onChange={(v) => update({ leasingFinAnnee: v })}
                        />
                        <div className="h-4" />
                      </div>
                    ) : null}
                  </div>
                )}
              />
            ) : null}
          </div>
        </QuestionCard>
      ) : null}

      {/* §2.5 Poursuites 🛡 */}
      {visible('poursuites') ? (
        <QuestionCard
          id={`emprunteurPoursuites${suffix}`}
          title={t('emprunteurPoursuites.title')}
          subtitle={t('emprunteurPoursuites.subtitle')}
          sensitive
          sensitiveLabel={tc('sensitive')}
          status={statusOf('poursuites')}
          highlight={highlightKey === 'emprunteurPoursuites'}
        >
          <div className="space-y-3">
            <YesNoToggle
              idBase={`e${emp.ordre}-a-poursuites`}
              yesLabel={tc('yes')}
              noLabel={tc('no')}
              value={emp.aPoursuites ?? null}
              onChange={(yes) => {
                patchEmp((e) => ({ ...e, aPoursuites: yes, poursuites: yes ? e.poursuites : [] }))
              }}
            />
            {emp.aPoursuites ? (
              <RepeatableGroup<Poursuite>
                items={emp.poursuites}
                onChange={(items) => set('poursuites', items)}
                makeEmpty={() => ({ origine: null, soldee: false, montant: null, motif: null })}
                labels={{ done: tc('done'), add: tc('add'), edit: tc('edit'), remove: tc('remove') }}
                renderSummary={(item) => (
                  <span>
                    {item.origine ? t(`emprunteurPoursuites.origines.${item.origine}`) : '—'}
                    {item.montant ? (
                      <span className="text-data text-ink-500"> · {formatCHF(item.montant)}</span>
                    ) : null}{' '}
                    · {item.soldee ? tc('yes') : tc('no')}
                  </span>
                )}
                renderForm={(item, update) => (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>{t('emprunteurPoursuites.origine')}</Label>
                      <Select
                        value={item.origine ?? undefined}
                        onValueChange={(v) => update({ origine: v as Poursuite['origine'] })}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['FISC', 'JEU', 'LEASING', 'INTERETS', 'AUTRE'] as const).map((v) => (
                            <SelectItem key={v} value={v}>
                              {t(`emprunteurPoursuites.origines.${v}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('emprunteurPoursuites.montant')}</Label>
                      <AmountInput
                        id={`e${emp.ordre}-poursuite-montant`}
                        value={item.montant ?? null}
                        onChange={(v) => update({ montant: v })}
                      />
                      <p className="text-ink-500 text-xs">{t('emprunteurPoursuites.montantInfo')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('emprunteurPoursuites.soldee')}</Label>
                      <YesNoToggle
                        idBase={`e${emp.ordre}-poursuite-soldee`}
                        yesLabel={tc('yes')}
                        noLabel={tc('no')}
                        value={item.soldee}
                        onChange={(v) => update({ soldee: v })}
                      />
                      <p className="text-ink-500 text-xs">{t('emprunteurPoursuites.soldeeInfo')}</p>
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

// §2.2 — formulaire d'un revenu : catégorie → sous-type → montant + branches.
function RevenuForm({
  item,
  update,
  ordre,
}: {
  item: Revenu
  update: (patch: Partial<Revenu>) => void
  ordre: number
}) {
  const t = useTranslations('wizard.questions')
  const tc = useTranslations('wizard.common')

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('emprunteurRevenus.categorie')}</Label>
        <Select
          value={item.categorie ?? undefined}
          onValueChange={(v) =>
            update({
              categorie: v as Revenu['categorie'],
              typeActivite: v === 'ACTIVITE' ? (item.typeActivite ?? 'SALARIE') : null,
              typeRente: null,
              typeAutre: null,
            })
          }
        >
          <SelectTrigger className="h-12 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['ACTIVITE', 'RENTE', 'AUTRE'] as const).map((v) => (
              <SelectItem key={v} value={v}>
                {t(`emprunteurRevenus.categories.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {item.categorie === 'ACTIVITE' ? (
        <div className="space-y-1.5">
          <Label>{t('emprunteurRevenus.typeActivite')}</Label>
          <Select
            value={item.typeActivite ?? undefined}
            onValueChange={(v) => update({ typeActivite: v as Revenu['typeActivite'] })}
          >
            <SelectTrigger className="h-12 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['SALARIE', 'INDEPENDANT', 'ACCESSOIRE', 'CHOMAGE', 'ETRANGER'] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`emprunteurRevenus.typesActivite.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {item.categorie === 'RENTE' ? (
        <div className="space-y-1.5">
          <Label>{t('emprunteurRevenus.typeRente')}</Label>
          <Select
            value={item.typeRente ?? undefined}
            onValueChange={(v) => update({ typeRente: v as Revenu['typeRente'] })}
          >
            <SelectTrigger className="h-12 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                ['AVS_AI', 'AI_3E_PILIER', 'SURVIVANT', 'ENFANT', 'VIAGERE', 'ETRANGERE'] as const
              ).map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`emprunteurRevenus.typesRente.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {item.categorie === 'AUTRE' ? (
        <div className="space-y-1.5">
          <Label>{t('emprunteurRevenus.typeAutre')}</Label>
          <Select
            value={item.typeAutre ?? undefined}
            onValueChange={(v) => update({ typeAutre: v as Revenu['typeAutre'] })}
          >
            <SelectTrigger className="h-12 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['PENSION_ALIMENTAIRE', 'DIVIDENDES', 'LOCATIF'] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`emprunteurRevenus.typesAutre.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* Montant — libellé/aide selon salarié ou indépendant */}
      <div className="space-y-1.5">
        <Label>
          {item.typeActivite === 'SALARIE'
            ? t('emprunteurRevenus.montantSalarie')
            : item.typeActivite === 'INDEPENDANT'
              ? t('emprunteurRevenus.montantIndependant')
              : t('emprunteurRevenus.montant')}
        </Label>
        <AmountInput
          id={`e${ordre}-rev-montant`}
          value={item.montantAnnuel || null}
          onChange={(v) => update({ montantAnnuel: v ?? 0 })}
        />
        {item.typeActivite === 'SALARIE' ? (
          <p className="text-ink-500 text-xs">{t('emprunteurRevenus.montantSalarieInfo')}</p>
        ) : item.typeActivite === 'INDEPENDANT' ? (
          <p className="text-ink-500 text-xs">{t('emprunteurRevenus.montantIndependantInfo')}</p>
        ) : null}
      </div>

      {/* Salarié : bonus 3 dernières années */}
      {item.typeActivite === 'SALARIE' ? (
        <div className="space-y-2">
          <Label>{t('emprunteurRevenus.bonus3Ans')}</Label>
          <YesNoToggle
            idBase={`e${ordre}-bonus`}
            yesLabel={tc('yes')}
            noLabel={tc('no')}
            value={item.bonus3Ans ?? null}
            onChange={(v) => update({ bonus3Ans: v, bonusMontants: v ? (item.bonusMontants ?? []) : null })}
          />
          {item.bonus3Ans ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Label>{t('emprunteurRevenus.bonusMontant', { n: i + 1 })}</Label>
                  <AmountInput
                    id={`e${ordre}-bonus-${i}`}
                    value={item.bonusMontants?.[i] ?? null}
                    onChange={(v) => {
                      const next = [...(item.bonusMontants ?? [])]
                      next[i] = v ?? 0
                      update({ bonusMontants: next })
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Indépendant : depuis quand ? */}
      {item.typeActivite === 'INDEPENDANT' ? (
        <div className="space-y-2">
          <Label>{t('emprunteurRevenus.independantDepuis')}</Label>
          <YesNoToggle
            idBase={`e${ordre}-indep`}
            yesLabel={t('emprunteurRevenus.independantOptions.plus3')}
            noLabel={t('emprunteurRevenus.independantOptions.moins3')}
            value={item.independantPlus3Ans ?? null}
            onChange={(v) =>
              update({ independantPlus3Ans: v, independantDepuisMois: v ? null : item.independantDepuisMois })
            }
          />
          {item.independantPlus3Ans === false ? (
            <div className="pt-1">
              <Label className="mb-2 block">{t('emprunteurRevenus.independantCurseur')}</Label>
              <NotchedSlider
                id={`e${ordre}-indep-duree`}
                ariaLabel={t('emprunteurRevenus.independantCurseur')}
                notches={[
                  { value: 3, label: t('emprunteurRevenus.durees.3m') },
                  { value: 6, label: t('emprunteurRevenus.durees.6m') },
                  { value: 12, label: t('emprunteurRevenus.durees.1a') },
                  { value: 24, label: t('emprunteurRevenus.durees.2a') },
                  { value: 36, label: t('emprunteurRevenus.durees.3a') },
                ]}
                value={item.independantDepuisMois ?? null}
                onChange={(v) => update({ independantDepuisMois: v })}
              />
              <div className="h-4" />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
