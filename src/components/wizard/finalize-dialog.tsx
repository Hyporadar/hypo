'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Radar } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'
import { needsMonitoring, type Echeance } from '@/lib/dossier/echeance'
import { track, trackFunnel } from '@/lib/track'
import { saveDossierAction } from '@/server/actions/dossier'
import { requestCallback } from '@/server/actions/callback'
import { submitTestLead } from '@/server/actions/test-lead'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Step = 'sending' | 'phone' | 'monitoring' | 'monitoringDone' | 'rateAlert' | 'done'
const SLOTS = ['matin', 'apres-midi', 'soir'] as const
type Slot = (typeof SLOTS)[number]

// Numéro suisse : 0XX XXX XX XX ou +41 / 0041 suivi de 9 chiffres.
function phoneValid(raw: string): boolean {
  const p = raw.replace(/[\s.\-/()]/g, '')
  return /^(?:\+41|0041)[1-9]\d{8}$/.test(p) || /^0[1-9]\d{8}$/.test(p)
}

function readUtm(): Record<string, string> | undefined {
  try {
    return JSON.parse(window.localStorage.getItem('hp-test-utm') ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}

// Popup de fin en plusieurs états :
//  A « sending »  → l'offre est envoyée par email (email capté à l'étape 4),
//                   transition automatique après 1,5 s ;
//  B « phone »    → proposition de transformer l'estimation en offres fermes
//                   (téléphone) OU alerte taux par email ;
//  « rateAlert »  → confirmation « c'est noté » puis fermeture ;
//  « done »       → confirmation finale après le numéro.
export function FinalizeDialog({
  open,
  onOpenChange,
  dossierId,
  funnel,
  data,
  email,
  echeance,
  testMode = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossierId: string
  funnel: Funnel
  data: DossierData
  /** Email déjà validé à l'étape 4 (capture inline). */
  email: string
  /** Tranche d'échéance : > 18 mois / inconnue → surveillance au lieu du tél. */
  echeance?: Echeance
  /** Site de test : soumission → TestLead (pas de vrai Lead ni email). */
  testMode?: boolean
}) {
  const t = useTranslations('wizard.finalize')
  const monitoring = needsMonitoring(echeance)
  const [step, setStep] = useState<Step>('sending')
  const [phone, setPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [callbackDate, setCallbackDate] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()
  const phoneOk = phoneValid(phone)

  // À l'ouverture : on capte l'email (offre « envoyée »), puis on passe
  // automatiquement à l'étape téléphone après 1,5 s. Le reset des états se
  // fait à la FERMETURE (voir close()) pour ne pas setState en synchrone ici.
  useEffect(() => {
    if (!open) return

    // Capture email (best-effort — n'interrompt pas l'animation).
    void (async () => {
      if (testMode) {
        await submitTestLead({ dossierId, funnel, data, email, echeance, utm: readUtm() }).catch(
          () => null
        )
      } else {
        await saveDossierAction({ dossierId, funnel, data }).catch(() => null)
        await requestCallback({ dossierId, email, echeance, notify: true }).catch(() => null)
      }
    })()

    // Échéance lointaine / inconnue → surveillance ; sinon → rappel téléphone.
    const timer = setTimeout(() => setStep(monitoring ? 'monitoring' : 'phone'), 1500)
    return () => clearTimeout(timer)
    // Ne (re)démarre que lorsque la popup s'ouvre ; les autres valeurs sont
    // stables le temps de l'ouverture (le wizard n'est pas édité en fond).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fermeture : on prévient le parent puis on réarme la popup pour la
  // prochaine ouverture (après l'animation de fermeture).
  function close() {
    onOpenChange(false)
    setTimeout(() => {
      setStep('sending')
      setPhone('')
      setPhoneTouched(false)
      setCallbackDate('')
      setSlot(null)
      setMessage('')
      setError(false)
    }, 200)
  }

  function submitPhone() {
    if (!phoneOk) {
      setPhoneTouched(true)
      return
    }
    setError(false)
    const date = /^\d{4}-\d{2}-\d{2}$/.test(callbackDate) ? callbackDate : undefined
    const msg = message.trim() || undefined
    startTransition(async () => {
      const result = testMode
        ? await submitTestLead({
            dossierId,
            funnel,
            data,
            email,
            phone,
            callbackDate: date,
            callbackSlot: slot ?? undefined,
            message: msg,
            utm: readUtm(),
          }).catch(() => ({ ok: false as const }))
        : await requestCallback({
            dossierId,
            email,
            phone,
            date,
            slot: slot ?? undefined,
            message: msg,
            notify: false,
          }).catch(() => ({ ok: false as const }))
      if (result.ok) {
        trackFunnel('contact')
        setStep('done')
      } else setError(true)
    })
  }

  // « Plus tard » : on se contente de l'email déjà capté (alerte taux).
  function chooseRateAlert() {
    setStep('rateAlert')
    startTransition(async () => {
      if (testMode) {
        await submitTestLead({
          dossierId,
          funnel,
          data,
          email,
          callbackSlot: 'ALERTE_TAUX',
          utm: readUtm(),
        }).catch(() => null)
      }
      // Vrai produit : l'email est déjà enregistré (state A), rien de plus.
    })
  }

  // Surveillance de l'échéance (branche > 18 mois / inconnue) : on marque
  // l'opt-in, l'email est déjà capté (state A) — pas de téléphone demandé.
  function activateMonitoring() {
    track('monitoring_optin', { echeance: echeance ?? null })
    trackFunnel('contact')
    setStep('monitoringDone')
    startTransition(async () => {
      if (testMode) {
        await submitTestLead({
          dossierId,
          funnel,
          data,
          email,
          callbackSlot: 'SURVEILLANCE',
          echeance,
          utm: readUtm(),
        }).catch(() => null)
      }
      // Vrai produit : l'email/echeance sont déjà enregistrés (state A).
    })
  }

  // Fermeture auto après une confirmation (« alerte taux » / surveillance).
  useEffect(() => {
    if (step !== 'rateAlert' && step !== 'monitoringDone') return
    const timer = setTimeout(() => close(), 2600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close()
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === 'sending' ? (
          <DialogHeader>
            <span className="bg-pilot-50 text-pilot-700 animate-in zoom-in-50 mx-auto flex size-14 items-center justify-center rounded-full duration-300">
              <CheckCircle2 className="size-7" strokeWidth={1.8} />
            </span>
            <DialogTitle className="text-center text-xl">{t('sending.title')}</DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {t('sending.body')}
            </DialogDescription>
          </DialogHeader>
        ) : step === 'phone' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">{t('phone.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('phone.body')}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                submitPhone()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="fin-phone">{t('phone.phoneLabel')}</Label>
                <Input
                  id="fin-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  placeholder={t('phone.phonePlaceholder')}
                  className="h-12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                />
                {phoneTouched && !phoneOk ? (
                  <p className="text-erreur text-xs">{t('phone.phoneError')}</p>
                ) : null}
              </div>

              {/* Créneau souhaité (facultatif) : date + moment de la journée */}
              <div className="space-y-2">
                <Label htmlFor="fin-date">{t('phone.whenLabel')}</Label>
                <Input
                  id="fin-date"
                  type="date"
                  className="h-12"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                />
                <div className="grid grid-cols-3 gap-1.5">
                  {SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={slot === s}
                      onClick={() => setSlot((prev) => (prev === s ? null : s))}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                        slot === s
                          ? 'border-pilot-600 bg-pilot-600 text-white'
                          : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
                      )}
                    >
                      {t(`phone.slots.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message libre (facultatif) */}
              <div className="space-y-1.5">
                <Label htmlFor="fin-message">{t('phone.messageLabel')}</Label>
                <Textarea
                  id="fin-message"
                  rows={2}
                  placeholder={t('phone.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {error ? <p className="text-erreur text-sm">{t('error')}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {t('phone.cta')}
              </Button>
            </form>
            <button
              type="button"
              onClick={chooseRateAlert}
              className="text-ink-400 hover:text-ink-600 mx-auto block text-xs underline-offset-2 hover:underline"
            >
              {t('phone.alertLink')}
            </button>
          </>
        ) : step === 'monitoring' ? (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-14 items-center justify-center rounded-full">
                <Radar className="size-7" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('monitoring.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('monitoring.body')}
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={activateMonitoring} disabled={pending}>
              {t('monitoring.cta')}
            </Button>
          </>
        ) : step === 'monitoringDone' ? (
          <DialogHeader>
            <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-14 items-center justify-center rounded-full">
              <CheckCircle2 className="size-7" strokeWidth={1.8} />
            </span>
            <DialogTitle className="text-center text-xl">{t('monitoringDone.title')}</DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {t('monitoringDone.body')}
            </DialogDescription>
          </DialogHeader>
        ) : step === 'rateAlert' ? (
          <DialogHeader>
            <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-14 items-center justify-center rounded-full">
              <CheckCircle2 className="size-7" strokeWidth={1.8} />
            </span>
            <DialogTitle className="text-center text-xl">{t('rateAlert.title')}</DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {t('rateAlert.body')}
            </DialogDescription>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-14 items-center justify-center rounded-full">
                <CheckCircle2 className="size-7" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('done.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('done.body')}
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" className="w-full" onClick={close}>
              {t('done.close')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
