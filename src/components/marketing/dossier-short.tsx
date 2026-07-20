'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Info } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'
import { ECHEANCES, type Echeance } from '@/lib/dossier/echeance'
import { track, trackFunnel, trackLeadConversion } from '@/lib/track'
import { submitTestLead } from '@/server/actions/test-lead'
import { EstimationSection } from '@/components/wizard/estimation-section'
import { FunnelToggle } from '@/components/wizard/funnel-choice'
import { AmountInput } from '@/components/wizard/inputs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const TEASER_KEY = 'hp-draft-renouvellement'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Petit « i » d'explication réutilisable (popover).
function InfoDot({ info }: { info: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={info}
          className="text-ink-400 hover:text-pilot-600 transition-colors"
        >
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-72 text-sm leading-relaxed">
        {info}
      </PopoverContent>
    </Popover>
  )
}

// Libellé + petit « i » d'explication (popover).
function FieldLabel({ htmlFor, label, info }: { htmlFor: string; label: string; info: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <InfoDot info={info} />
    </div>
  )
}

// Chemin court (/dossier/2) : 3 chiffres → estimation directe. Réutilise le
// moteur de taux et l'écran d'estimation (email + rappel) du wizard complet.
// `initialFunnel` pré-sélectionne le toggle (pages /acheter, /renouveler).
export function DossierShort({ initialFunnel }: { initialFunnel?: Funnel }) {
  const t = useTranslations('dossierShort')
  const [funnel, setFunnel] = useState<Funnel | null>(initialFunnel ?? null)
  const [valeur, setValeur] = useState<number | null>(null)
  const [montant, setMontant] = useState<number | null>(null)
  const [revenu, setRevenu] = useState<number | null>(null)
  const [echeance, setEcheance] = useState<Echeance | null>(null)
  // 'form' → saisie ; 'estimation' → résultat ; 'ltv' → montants incohérents.
  const [view, setView] = useState<'form' | 'estimation' | 'ltv'>('form')
  const [highlight, setHighlight] = useState(false)

  // Bloc LTV : capture d'email « Être contacté » (cas hors cadre standard).
  const [ltvContactOpen, setLtvContactOpen] = useState(false)
  const [ltvEmail, setLtvEmail] = useState('')
  const [ltvEmailTouched, setLtvEmailTouched] = useState(false)
  const [ltvDone, setLtvDone] = useState(false)
  const [ltvPending, startLtv] = useTransition()

  const [dossierId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `short-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  )

  const isRenew = funnel === 'RENOUVELLEMENT_CHAUD'
  const echeanceOk = !isRenew || echeance != null
  const valid =
    funnel != null &&
    (valeur ?? 0) > 0 &&
    (montant ?? 0) > 0 &&
    (revenu ?? 0) > 0 &&
    echeanceOk
  const ltvOver = (valeur ?? 0) > 0 && (montant ?? 0) > (valeur ?? 0) * 0.8

  // Préremplissage depuis le teaser de la home (valeur / montant / revenu) :
  // le visiteur arrivé via « Continuer » ne re-saisit rien. Sans funnel imposé
  // par la page, un teaser présent = parcours renouvellement.
  /* eslint-disable react-hooks/set-state-in-effect -- reprise au montage */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEASER_KEY)
      if (!raw) return
      const v = (JSON.parse(raw) as { values?: Record<string, number | string | null> }).values
      if (!v) return
      if (typeof v.propertyValue === 'number') setValeur(v.propertyValue)
      if (typeof v.amount === 'number') setMontant(v.amount)
      if (typeof v.income === 'number') setRevenu(v.income)
      if (!initialFunnel) setFunnel('RENOUVELLEMENT_CHAUD')
    } catch {
      // stockage indisponible : formulaire vierge
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Entonnoir : « Visite » à l'arrivée sur le parcours court.
  useEffect(() => {
    trackFunnel('visit')
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const data = useMemo(
    () =>
      ({
        bien: { usage: 'RESIDENCE_PRINCIPALE', valeur: valeur ?? null, prixAchat: null },
        tranchesExistantes: [],
        autresPrets: [],
        ajustement: {},
        montantTotal: montant ?? null,
        tranchesSouhaitees: [],
        dateDebut: null,
        emprunteurs: [
          {
            ordre: 1,
            aRevenu: true,
            revenus: [{ categorie: 'ACTIVITE', typeActivite: 'SALARIE', montantAnnuel: revenu ?? 0 }],
            charges: [],
            avoirs: [],
            poursuites: [],
          },
        ],
        autresBiens: [],
        asks: {},
      }) as DossierData,
    [valeur, montant, revenu]
  )

  function selectEcheance(e: Echeance) {
    setEcheance(e)
    track('echeance_selected', { echeance: e })
  }

  function handleSubmit() {
    if (!valid) return
    trackFunnel('criteria')
    // Contrôle de cohérence LTV : hypothèque > 80 % de la valeur → hors cadre.
    if (ltvOver) {
      setView('ltv')
      return
    }
    setView('estimation')
  }

  function backToForm() {
    setView('form')
    setHighlight(true)
    setLtvContactOpen(false)
  }

  function submitLtvContact() {
    setLtvEmailTouched(true)
    const e = ltvEmail.trim()
    if (!EMAIL_RE.test(e)) return
    track('non_standard_lead', { reason: 'ltv' })
    trackFunnel('contact')
    startLtv(async () => {
      const res = await submitTestLead({
        dossierId,
        funnel: (funnel ?? 'ACHAT') as Exclude<Funnel, never>,
        data,
        email: e,
        message: 'Cas non standard (ltv) - parcours court',
        echeance: isRenew ? (echeance ?? undefined) : undefined,
      }).catch(() => null)
      if (res?.ok) trackLeadConversion()
      setLtvDone(true)
    })
  }

  if (view === 'estimation' && funnel) {
    return (
      <EstimationSection
        funnel={funnel}
        data={data}
        dossierId={dossierId}
        echeance={isRenew ? (echeance ?? undefined) : undefined}
        testMode
      />
    )
  }

  return (
    <div className="border-line mx-auto max-w-md rounded-xl border bg-white p-6 sm:p-8">
      <h1 className="font-display text-xl font-semibold sm:text-2xl">{t('title')}</h1>
      <p className="text-ink-500 mt-1 text-sm leading-relaxed">{t('subtitle')}</p>

      {view === 'ltv' ? (
        // Message doux : montants à revérifier OU cas hors cadre standard.
        <div className="mt-6">
          <p className="text-ink-700 text-sm leading-relaxed">{t('ltv.body')}</p>
          {ltvDone ? (
            <p className="text-pilot-700 mt-4 text-sm font-medium">{t('ltv.thanks')}</p>
          ) : ltvContactOpen ? (
            <form
              className="mt-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                submitLtvContact()
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-label={t('ltv.emailPlaceholder')}
                  placeholder={t('ltv.emailPlaceholder')}
                  className="h-12 flex-1"
                  value={ltvEmail}
                  onChange={(e) => setLtvEmail(e.target.value)}
                  onBlur={() => setLtvEmailTouched(true)}
                />
                <Button type="submit" size="lg" className="h-12 shrink-0" disabled={ltvPending}>
                  {t('ltv.contact')}
                </Button>
              </div>
              {ltvEmailTouched && !EMAIL_RE.test(ltvEmail.trim()) ? (
                <p className="text-erreur mt-1.5 text-xs">{t('ltv.emailError')}</p>
              ) : null}
            </form>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="button" size="lg" className="flex-1" onClick={backToForm}>
                {t('ltv.correct')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => setLtvContactOpen(true)}
              >
                {t('ltv.contact')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <FunnelToggle
            value={funnel}
            onChange={(f) => {
              setFunnel(f)
              setHighlight(false)
            }}
            info={t('funnelInfo')}
          />
          <div className="space-y-1.5">
            <FieldLabel htmlFor="q-valeur" label={t('valeur')} info={t('infoValeur')} />
            <AmountInput id="q-valeur" value={valeur} onChange={setValeur} highlight={highlight} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="q-montant" label={t('montant')} info={t('infoMontant')} />
            <AmountInput id="q-montant" value={montant} onChange={setMontant} highlight={highlight} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="q-revenu" label={t('revenu')} info={t('infoRevenu')} />
            <AmountInput id="q-revenu" value={revenu} onChange={setRevenu} placeholder="p.ex. 150'000" />
          </div>

          {/* Échéance — branche renouvellement uniquement, obligatoire. */}
          {isRenew ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">{t('echeance.label')}</p>
                <InfoDot info={t('echeance.info')} />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ECHEANCES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={echeance === e}
                    onClick={() => selectEcheance(e)}
                    className={cn(
                      'rounded-lg border px-1.5 py-2 text-center text-xs font-medium transition-colors',
                      echeance === e
                        ? 'border-pilot-600 bg-pilot-600 text-white'
                        : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
                    )}
                  >
                    {t(`echeance.options.${e}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={!valid}>
            {t('cta')}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      )}
    </div>
  )
}
