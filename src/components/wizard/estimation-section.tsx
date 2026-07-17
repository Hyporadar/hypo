'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Headset, Landmark, PiggyBank, Umbrella } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { formatCHF, formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { track, trackFunnel } from '@/lib/track'
import type { DossierData } from '@/lib/dossier/schema'
import type { Echeance } from '@/lib/dossier/echeance'
import {
  buildRateProfile,
  estimateRate,
  type Duration,
  type EngineBase,
  type LenderType,
} from '@/lib/dossier/rate-engine'
import { saveDossierAction } from '@/server/actions/dossier'
import { requestCallback } from '@/server/actions/callback'
import { submitTestLead } from '@/server/actions/test-lead'
import { FinalizeDialog } from '@/components/wizard/finalize-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const LENDER_ICONS: Record<LenderType, typeof Landmark> = {
  BANQUE: Landmark,
  ASSURANCE: Umbrella,
  CAISSE_PENSION: PiggyBank,
}
const DURATIONS: Array<{ key: Duration; years?: number }> = [
  { key: 'saron' },
  { key: 'y5', years: 5 },
  { key: 'y10', years: 10 },
  { key: 'y15', years: 15 },
]
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function readUtm(): Record<string, string> | undefined {
  try {
    return JSON.parse(window.localStorage.getItem('hp-test-utm') ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}

// Animation count-up (~300 ms) du gros chiffre à chaque changement de valeur.
function useCountUp(target: number, duration = 300): number {
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

// Étape 4 : estimation du taux calculée en local (rate-engine) à partir des
// réponses des étapes 1-3. Aucun backend : tout est recalculé côté client.
export function EstimationSection({
  funnel,
  data,
  dossierId,
  echeance,
  testMode = false,
}: {
  funnel: Funnel
  data: DossierData
  dossierId: string
  /** Tranche d'échéance (branche renouvellement) — pilote la popup de fin. */
  echeance?: Echeance
  testMode?: boolean
}) {
  const t = useTranslations('wizard.estimation')
  const to = useTranslations('wizard.offers')

  const [duration, setDuration] = useState<Duration>('y10')
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [nsDone, setNsDone] = useState(false)
  const [nsPending, startNs] = useTransition()
  const emailValid = EMAIL_RE.test(email.trim())

  // Base de taux du jour (BNS) — rendu instantané sur l'ancre, puis affiné
  // dès que les taux live arrivent (le gros chiffre anime le changement).
  const [liveBase, setLiveBase] = useState<EngineBase | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/rates/today')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.base) setLiveBase(j.base as EngineBase)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const profile = useMemo(() => buildRateProfile(funnel, data), [funnel, data])
  const result = useMemo(
    () => estimateRate(profile, duration, liveBase ?? undefined),
    [profile, duration, liveBase]
  )

  const from = result.nonStandard ? null : result.from
  const animatedFrom = useCountUp(from ?? 0)

  // Cas non standard « qualifiant » (LTV / charges) → carte conseiller.
  const nsReason = result.nonStandard && result.reason !== 'incomplete' ? result.reason : null

  // estimation_viewed : une fois par affichage de l'étape.
  const viewedRef = useRef(false)
  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track('estimation_viewed', { estimated_rate: from, duration_selected: duration })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // non_standard_lead : dès qu'un motif qualifiant apparaît.
  useEffect(() => {
    if (nsReason) track('non_standard_lead', { reason: nsReason })
  }, [nsReason])

  function submitEmailStandard() {
    setEmailTouched(true)
    if (!emailValid) return
    track('email_submitted', { estimated_rate: from, duration_selected: duration })
    trackFunnel('advance')
    setFinalizeOpen(true)
  }

  function submitNonStandard() {
    setEmailTouched(true)
    if (!emailValid) return
    const e = email.trim()
    const note = `Cas non standard (${nsReason})`
    trackFunnel('advance')
    trackFunnel('contact')
    startNs(async () => {
      if (testMode) {
        await submitTestLead({
          dossierId,
          funnel,
          data,
          email: e,
          message: note,
          echeance,
          utm: readUtm(),
        }).catch(() => null)
      } else {
        await saveDossierAction({ dossierId, funnel, data }).catch(() => null)
        await requestCallback({ dossierId, email: e, message: note, notify: true }).catch(() => null)
      }
      setNsDone(true)
    })
  }

  // ── Cas non standard : pas de taux, capture d'un lead à qualifier ──
  if (nsReason) {
    return (
      <div className="border-line rounded-xl border bg-white p-6 sm:p-8">
        <div className="text-center">
          <span className="bg-ambre-50 text-ambre-700 mx-auto flex size-12 items-center justify-center rounded-full">
            <Headset className="size-6" strokeWidth={1.8} />
          </span>
          <h2 className="font-display mt-4 text-xl font-semibold sm:text-2xl">
            {t('nonStandard.title')}
          </h2>
          <p className="text-ink-500 mx-auto mt-2 max-w-md text-sm leading-relaxed">
            {t('nonStandard.body')}
          </p>
        </div>
        {nsDone ? (
          <p className="text-pilot-700 mt-6 text-center text-sm font-medium">
            {t('nonStandard.thanks')}
          </p>
        ) : (
          <form
            className="mx-auto mt-6 max-w-md"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              submitNonStandard()
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label={t('emailPlaceholder')}
                placeholder={t('emailPlaceholder')}
                className="h-12 flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
              />
              <Button type="submit" size="lg" className="h-12 shrink-0" disabled={nsPending}>
                {t('nonStandard.cta')}
              </Button>
            </div>
            {emailTouched && !emailValid ? (
              <p className="text-erreur mt-1.5 text-xs">{t('emailError')}</p>
            ) : null}
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border-line rounded-xl border bg-white p-6 sm:p-8">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t('title')}</h2>
          <p className="text-ink-500 mx-auto mt-1 max-w-md text-sm leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {result.nonStandard ? (
          // Données insuffisantes (reason 'incomplete') : on invite à compléter.
          <p className="text-ink-500 mt-6 text-center text-sm">{to('empty')}</p>
        ) : (
          <>
            {/* Taux « dès X% » en grand (animé) */}
            <p className="mt-6 text-center">
              <span className="text-ink-500 text-sm">{to('from')} </span>
              <span className="text-data text-pilot-700 text-4xl font-semibold">
                {formatRate(animatedFrom)}
              </span>
            </p>

            {/* Économie potentielle */}
            {result.economyPerYear > 0 ? (
              <p className="text-pilot-700 mt-1 text-center text-sm">
                {t('economy', { amount: formatCHF(result.economyPerYear) })}
              </p>
            ) : null}

            {/* Sélecteur de durée */}
            <div
              role="radiogroup"
              aria-label={to('duration')}
              className="mt-5 flex flex-wrap justify-center gap-1.5"
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
                  {d.years ? to('years', { years: d.years }) : 'SARON'}
                </button>
              ))}
            </div>

            {/* Fourchettes par type de prêteur */}
            <ul className="mx-auto mt-5 max-w-md space-y-2.5">
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
                      <p className="text-sm font-medium">{to(`lenderTypes.${offer.type}`)}</p>
                      <p className="text-ink-500 text-xs">
                        {to('from')} {formatRate(offer.min)} – {formatRate(offer.max)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {/* Capture email inline — l'offre part par email, le téléphone
            n'est demandé qu'ensuite dans la popup. */}
        <form
          className="mx-auto mt-8 max-w-md"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submitEmailStandard()
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label={t('emailPlaceholder')}
              placeholder={t('emailPlaceholder')}
              className="h-12 flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
            <Button type="submit" size="lg" className="h-12 shrink-0">
              {t('emailCta')}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          {emailTouched && !emailValid ? (
            <p className="text-erreur mt-1.5 text-xs">{t('emailError')}</p>
          ) : null}
          <p className="text-ink-500 mt-2 text-center text-xs leading-relaxed">{t('emailNote')}</p>
        </form>
      </div>

      <FinalizeDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        dossierId={dossierId}
        funnel={funnel}
        data={data}
        email={email.trim()}
        echeance={echeance}
        testMode={testMode}
      />
    </div>
  )
}
