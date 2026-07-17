'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Headset, Landmark, PiggyBank, Umbrella, X } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { formatCHF, formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { track, trackFunnel } from '@/lib/track'
import type { DossierData } from '@/lib/dossier/schema'
import { computeAffordability, amortissementAnnuel } from '@/lib/dossier/affordability'
import {
  engineBase,
  estimateRate,
  type Duration,
  type EngineBase,
  type LenderType,
} from '@/lib/dossier/rate-engine'
import { submitTestLead } from '@/server/actions/test-lead'
import { AutocompleteField } from '@/components/wizard/autocomplete'
import { CallbackDialog } from '@/components/marketing/callback-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Le calculateur de la home (« Quel taux pouvez-vous obtenir ? ») : curseurs +
// NPA/localité, résultat en temps réel branché sur le moteur `estimateRate`.
// Trois états : standard (fourchette), limite (fourchette + bandeau conseiller),
// non finançable (pas de taux, prise de contact bienveillante).

export interface WidgetRates {
  saron: number | null
  fixed: Record<number, number> // durée en années → taux
}

interface AmountRowProps {
  id: string
  label: string
  value: number
  max: number
  step: number
  onChange: (v: number) => void
}

// Ligne : libellé + champ CHF + curseur minimaliste. Rend les 3 cellules d'une
// grille partagée (voir le conteneur) — la colonne des libellés se dimensionne
// une seule fois sur le plus long, donc toutes les cases sont alignées.
function AmountRow({ id, label, value, max, step, onChange }: AmountRowProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <>
      <label htmlFor={id} className="text-ink-700 text-sm">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          placeholder="0"
          className="text-data focus-visible:border-pilot-500 border-line placeholder:text-ink-400 h-9 w-full rounded-md border bg-white pr-9 pl-2.5 text-right text-sm focus-visible:outline-none"
          value={value === 0 ? '' : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '')
            onChange(Math.min(max, digits ? Number(digits) : 0))
          }}
        />
        <span className="text-ink-400 text-data pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs">
          CHF
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hp-range w-full"
        style={{
          background: `linear-gradient(to right, var(--color-pilot-600) ${pct}%, var(--color-line) ${pct}%)`,
        }}
      />
    </>
  )
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const DURATIONS: Array<{ key: Duration; years?: number }> = [
  { key: 'saron' },
  { key: 'y5', years: 5 },
  { key: 'y10', years: 10 },
  { key: 'y15', years: 15 },
]
const LENDER_ICONS: Record<LenderType, typeof Landmark> = {
  BANQUE: Landmark,
  ASSURANCE: Umbrella,
  CAISSE_PENSION: PiggyBank,
}
const LENDER_KEYS: Record<LenderType, string> = {
  BANQUE: 'bank',
  ASSURANCE: 'insurance',
  CAISSE_PENSION: 'pension',
}

// Animation count-up (~350 ms) du gros chiffre à chaque changement de valeur.
function useCountUp(target: number, duration = 350): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - p) * (1 - p)
      setValue(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else {
        fromRef.current = target
        setValue(target)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function readUtm(): Record<string, string> | undefined {
  try {
    return JSON.parse(window.localStorage.getItem('hp-test-utm') ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}

export function HomeLeadWidget({ rates }: { rates: WidgetRates }) {
  const t = useTranslations('home.leadWidget')
  const router = useRouter()
  const [propertyValue, setPropertyValue] = useState(0)
  const [mortgage, setMortgage] = useState(0)
  const [income, setIncome] = useState(0)
  const [plz, setPlz] = useState('')
  const [duration, setDuration] = useState<Duration>('y10')

  // Recalcul avec 300 ms de debounce : les curseurs restent fluides, le
  // résultat (et le tracking) ne se met à jour qu'après une courte pause.
  const [deb, setDeb] = useState({ v: 0, m: 0, r: 0 })
  useEffect(() => {
    const id = setTimeout(() => setDeb({ v: propertyValue, m: mortgage, r: income }), 300)
    return () => clearTimeout(id)
  }, [propertyValue, mortgage, income])

  const [dossierId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `home-${Math.random().toString(36).slice(2)}`
  )

  const base: EngineBase = useMemo(() => {
    const def = engineBase()
    return {
      saron: rates.saron ?? def.saron,
      y5: rates.fixed[5] ?? def.y5,
      y10: rates.fixed[10] ?? def.y10,
      y15: rates.fixed[15] ?? def.y15,
    }
  }, [rates])

  const aff = useMemo(() => computeAffordability(deb.m, deb.v, deb.r), [deb])
  const result = useMemo(
    () =>
      estimateRate(
        {
          montant: deb.m,
          valeur: deb.v,
          revenusBrutsAnnuels: deb.r,
          amortissementAnnuel: amortissementAnnuel(deb.m, deb.v),
          usage: 'principal',
          forward: false,
        },
        duration,
        base,
        { allowBorderline: true }
      ),
    [deb, duration, base]
  )

  const from = result.nonStandard ? 0 : result.from
  const animatedFrom = useCountUp(from)

  // NPA suisse (4 chiffres) ou localité (au moins 2 lettres) — validation
  // de forme seulement ; le NPA ne change pas le taux.
  const plzTrimmed = plz.trim()
  const plzInvalid =
    plzTrimmed !== '' && !/^\d{4}$/.test(plzTrimmed) && !/\p{L}{2,}/u.test(plzTrimmed)

  const data = useMemo(
    () =>
      ({
        bien: {
          usage: 'RESIDENCE_PRINCIPALE',
          valeur: deb.v || null,
          prixAchat: null,
          ...(() => {
            // « 2800 Delémont » / « 2800 » / « Delémont » → npa + localité.
            const npa = plzTrimmed.match(/\d{4}/)?.[0]
            const localite = plzTrimmed.replace(/\d{4}/, '').replace(/^[A-Za-z]{2}-/, '').trim()
            const out: { npa?: string; localite?: string } = {}
            if (npa) out.npa = npa
            if (localite) out.localite = localite
            return out
          })(),
        },
        tranchesExistantes: [],
        autresPrets: [],
        ajustement: {},
        montantTotal: deb.m || null,
        tranchesSouhaitees: [],
        dateDebut: null,
        emprunteurs: [
          {
            ordre: 1,
            aRevenu: true,
            revenus: [{ categorie: 'ACTIVITE', typeActivite: 'SALARIE', montantAnnuel: deb.r || 0 }],
            charges: [],
            avoirs: [],
            poursuites: [],
          },
        ],
        autresBiens: [],
        asks: {},
      }) as DossierData,
    [deb, plzTrimmed]
  )

  // Entonnoir : « Visite » dès l'affichage du calculateur.
  useEffect(() => {
    trackFunnel('visit')
  }, [])

  // Tracking : un event par état (dédupliqué sur état + LTV + charges).
  const sigRef = useRef('')
  useEffect(() => {
    if (aff.state === 'incomplete') return
    // Entonnoir : « Critères saisis » dès qu'un résultat s'affiche.
    trackFunnel('criteria')
    const ltvPct = Math.round(aff.ltv * 100)
    const chargesPct = Math.round(aff.charges * 100)
    const sig = `${aff.state}:${ltvPct}:${chargesPct}`
    if (sig === sigRef.current) return
    sigRef.current = sig
    track(`calc_result_${aff.state}`, {
      ltv: ltvPct,
      charges: chargesPct,
      montant: deb.m,
      valeur: deb.v,
      revenu: deb.r,
    })
  }, [aff, deb])

  // Non finançable : capture d'email « échange gratuit ».
  const [nfEmail, setNfEmail] = useState('')
  const [nfTouched, setNfTouched] = useState(false)
  const [nfDone, setNfDone] = useState(false)
  const [nfPending, startNf] = useTransition()

  function submitNonFundable() {
    setNfTouched(true)
    const e = nfEmail.trim()
    if (!EMAIL_RE.test(e)) return
    track('non_fundable_lead', {
      ltv: Math.round(aff.ltv * 100),
      charges: Math.round(aff.charges * 100),
    })
    trackFunnel('advance')
    trackFunnel('contact')
    startNf(async () => {
      await submitTestLead({
        dossierId,
        funnel: 'RENOUVELLEMENT_CHAUD',
        data,
        email: e,
        message: 'Non finançable (calculateur home)',
        utm: readUtm(),
      }).catch(() => null)
      setNfDone(true)
    })
  }

  // Micro-feedback pédagogique (états limite / non finançable) : les leviers
  // qui font repasser le dossier dans les critères standards.
  const microFeedback = useMemo(() => {
    if (aff.state !== 'borderline' && aff.state !== 'nonfundable') return null
    const revenuOk = aff.revenuMin != null && aff.revenuMin > deb.r
    const hMax = Math.floor(aff.hypothequeMax / 5000) * 5000
    const mortgageOk = hMax > 0 && hMax < deb.m
    if (revenuOk && mortgageOk) {
      return t('microBoth', {
        revenu: formatCHF(Math.ceil(aff.revenuMin! / 1000) * 1000),
        montant: formatCHF(hMax),
      })
    }
    if (revenuOk) return t('microIncome', { revenu: formatCHF(Math.ceil(aff.revenuMin! / 1000) * 1000) })
    if (mortgageOk) return t('microMortgage', { montant: formatCHF(hMax) })
    return null
  }, [aff, deb, t])

  function continueToFunnel() {
    trackFunnel('advance')
    // Préremplit le brouillon partagé — le parcours court repart de ces
    // montants sans ressaisie.
    try {
      window.localStorage.setItem(
        'hp-draft-renouvellement',
        JSON.stringify({
          draftId: crypto.randomUUID(),
          step: 0,
          values: {
            amount: mortgage || null,
            propertyValue: propertyValue || null,
            income: income || null,
            plz: plz || null,
            endMonth: '',
          },
          attribution: {},
          updatedAt: new Date().toISOString(),
        })
      )
    } catch {
      // stockage indisponible : la demande partira vide
    }
    router.push('/demande')
  }

  const showResult = aff.state !== 'incomplete'

  // Overlay des résultats : s'ouvre automatiquement dès qu'un résultat est
  // calculable, par-dessus le site (fond flouté). Un clic dehors / Échap le
  // ferme ; il ne se rouvre pas pour les mêmes montants (mémo de signature).
  const [open, setOpen] = useState(false)
  const shownSigRef = useRef<string | null>(null)
  useEffect(() => {
    if (aff.state === 'incomplete') return
    const sig = `${deb.v}|${deb.m}|${deb.r}`
    if (sig === shownSigRef.current) return
    shownSigRef.current = sig
    setOpen(true)
  }, [aff.state, deb])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Contenu du résultat (3 états) affiché dans l'overlay.
  const resultContent =
    aff.state === 'nonfundable' ? (
      // ── Non finançable en l'état : pas de taux, prise de contact douce ──
      <div className="text-center">
        <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
          <Headset className="size-6" strokeWidth={1.8} />
        </span>
        <p className="font-display mt-4 text-lg font-semibold">{t('nonFundableTitle')}</p>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">{t('nonFundableBody')}</p>
        {nfDone ? (
          <p className="text-pilot-700 mt-4 text-sm font-medium">{t('nonFundableThanks')}</p>
        ) : (
          <form
            className="mt-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              submitNonFundable()
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label={t('nonFundableEmail')}
                placeholder={t('nonFundableEmail')}
                className="h-12 flex-1"
                value={nfEmail}
                onChange={(e) => setNfEmail(e.target.value)}
                onBlur={() => setNfTouched(true)}
              />
              <Button type="submit" size="lg" className="h-12 shrink-0" disabled={nfPending}>
                {t('nonFundableCta')}
              </Button>
            </div>
            {nfTouched && !EMAIL_RE.test(nfEmail.trim()) ? (
              <p className="text-erreur mt-1.5 text-left text-xs">{t('emailError')}</p>
            ) : null}
          </form>
        )}
        {microFeedback ? (
          <p className="text-ink-500 mt-3 text-xs leading-relaxed">{microFeedback}</p>
        ) : null}
      </div>
    ) : (
      // ── Standard / limite : fourchette calibrée ──
      <div>
        {aff.state === 'borderline' ? (
          <div className="border-ambre-300 bg-ambre-50 mb-4 rounded-xl border p-4">
            <p className="text-ambre-800 text-sm leading-relaxed">{t('borderlineBanner')}</p>
            <div className="mt-3">
              <CallbackDialog
                triggerLabel={t('borderlineCta')}
                onOpen={() => {
                  track('borderline_lead', {
                    ltv: Math.round(aff.ltv * 100),
                    charges: Math.round(aff.charges * 100),
                  })
                  trackFunnel('advance')
                }}
              />
            </div>
          </div>
        ) : null}

        {!result.nonStandard ? (
          <div>
            <p className="text-center">
              <span className="text-ink-500 text-sm">{t('from')} </span>
              <span className="text-data text-pilot-700 text-4xl font-semibold">
                {formatRate(animatedFrom)}
              </span>
            </p>

            {/* Sélecteur de durée */}
            <div
              role="radiogroup"
              aria-label={t('duration')}
              className="mt-4 flex flex-wrap justify-center gap-1.5"
            >
              {DURATIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  role="radio"
                  aria-checked={duration === d.key}
                  onClick={() => setDuration(d.key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    duration === d.key
                      ? 'border-pilot-600 bg-pilot-600 text-white'
                      : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
                  )}
                >
                  {d.years ? t('years', { years: d.years }) : 'SARON'}
                </button>
              ))}
            </div>

            {/* Fourchettes par type de prêteur */}
            <ul className="mt-5 space-y-2.5">
              {result.lenders.map((offer) => {
                const Icon = LENDER_ICONS[offer.type]
                return (
                  <li
                    key={offer.type}
                    className="border-line flex items-center gap-3 rounded-xl border p-3.5"
                  >
                    <span className="bg-pilot-50 text-pilot-700 flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4.5" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t(LENDER_KEYS[offer.type])}</p>
                      <p className="text-ink-500 text-xs">
                        {t('from')} {formatRate(offer.min)} – {formatRate(offer.max)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            {aff.state === 'standard' ? (
              <Button className="mt-5 w-full" onClick={continueToFunnel}>
                {t('standardCta')}
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
        ) : null}

        {microFeedback ? (
          <p className="text-ink-500 mt-3 text-center text-xs leading-relaxed">{microFeedback}</p>
        ) : null}
      </div>
    )

  return (
    <>
    <Card id="simulateur" className="border-line scroll-mt-24 shadow-sm">
      <CardContent className="p-6 sm:p-8">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-balance sm:text-2xl">{t('title')}</h2>
          <p className="text-ink-700 mt-1">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 items-center gap-x-3 gap-y-4 sm:grid-cols-[auto_120px_1fr]">
          <AmountRow
            id="hw-property"
            label={t('propertyValue')}
            value={propertyValue}
            max={3_000_000}
            step={50_000}
            onChange={(v) => {
              setPropertyValue(v)
              if (mortgage === 0 && v > 0) setMortgage(Math.round((v * 0.65) / 25_000) * 25_000)
            }}
          />
          <AmountRow
            id="hw-mortgage"
            label={t('mortgage')}
            value={mortgage}
            max={2_400_000}
            step={25_000}
            onChange={setMortgage}
          />
          <AmountRow
            id="hw-income"
            label={t('income')}
            value={income}
            max={500_000}
            step={5_000}
            onChange={setIncome}
          />
          <label htmlFor="hw-plz" className="text-ink-700 text-sm">
            {t('plz')}
          </label>
          <div className="sm:col-span-2">
            <AutocompleteField
              id="hw-plz"
              value={plz}
              placeholder={t('plzPlaceholder')}
              endpoint="/api/localities"
              onSelect={(item) => {
                const p = item.payload as { npa?: string; localite?: string }
                setPlz(p.npa && p.localite ? `${p.npa} ${p.localite}` : item.label)
              }}
              onTextChange={(text) => setPlz(text.slice(0, 60))}
            />
            {plzInvalid ? <p className="text-ambre-700 mt-1 text-xs">{t('plzError')}</p> : null}
          </div>
        </div>

        {!showResult ? (
          <p className="text-ink-500 mt-8 text-center text-sm">{t('emptyHint')}</p>
        ) : null}

        <p className="text-ink-700 mt-8 text-center text-sm">
          {t('buyHint')}{' '}
          <button
            type="button"
            onClick={() => router.push('/acheter')}
            className="text-pilot-700 font-medium underline-offset-4 hover:underline"
          >
            {t('buyCta')}
          </button>
        </p>
      </CardContent>
    </Card>

    {/* Overlay des résultats : par-dessus le site, fond flouté, clic dehors = fermer */}
    {open && showResult ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setOpen(false)}
          className="bg-ink-900/50 absolute inset-0 backdrop-blur-lg"
        />
        <div className="animate-in fade-in zoom-in-95 border-line relative z-10 max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border bg-white p-6 shadow-xl duration-200 sm:p-7">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="text-ink-400 hover:text-ink-700 absolute top-3 right-3 transition-colors"
          >
            <X className="size-5" />
          </button>

          {/* Curseurs réajustables dans la pop-up : le résultat se met à jour en direct */}
          <div className="grid grid-cols-1 items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_120px_1fr]">
            <AmountRow
              id="ov-property"
              label={t('propertyValue')}
              value={propertyValue}
              max={3_000_000}
              step={50_000}
              onChange={setPropertyValue}
            />
            <AmountRow
              id="ov-mortgage"
              label={t('mortgage')}
              value={mortgage}
              max={2_400_000}
              step={25_000}
              onChange={setMortgage}
            />
            <AmountRow
              id="ov-income"
              label={t('income')}
              value={income}
              max={500_000}
              step={5_000}
              onChange={setIncome}
            />
          </div>

          <div className="h-5" />

          {resultContent}
        </div>
      </div>
    ) : null}
    </>
  )
}
