'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, CalendarClock, CheckCircle2, Mail, PartyPopper, Phone } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'
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
import { cn } from '@/lib/utils'

type Slot = 'matin' | 'apres-midi' | 'soir'
type Step = 'ready' | 'email' | 'callback' | 'done'

// Popup de finalisation : dossier prêt → email → téléphone + date/créneau
// de rappel → confirmation (accès au dossier par email).
export function FinalizeDialog({
  open,
  onOpenChange,
  dossierId,
  funnel,
  data,
  testMode = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossierId: string
  funnel: Funnel
  data: DossierData
  /** Site de test : soumission → TestLead (pas de vrai Lead ni email). */
  testMode?: boolean
}) {
  const t = useTranslations('wizard.finalize')
  const [step, setStep] = useState<Step>('ready')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)

  function reset() {
    setStep('ready')
    setEmail('')
    setPhone('')
    setDate('')
    setSlot(null)
    setError(false)
  }

  function confirm() {
    if (!phone || !date || !slot) return
    setError(false)
    startTransition(async () => {
      if (testMode) {
        // Site de test : on écrit uniquement dans TestLead (pas de vrai
        // dossier, pas d'email). UTM récupérés au premier atterrissage.
        let utm: Record<string, string> | undefined
        try {
          utm = JSON.parse(window.localStorage.getItem('hp-test-utm') ?? 'null') ?? undefined
        } catch {
          utm = undefined
        }
        const result = await submitTestLead({
          dossierId,
          funnel,
          data,
          email,
          phone,
          callbackDate: date,
          callbackSlot: slot,
          utm,
        }).catch(() => ({ ok: false as const }))
        if (result.ok) setStep('done')
        else setError(true)
        return
      }
      // On force une sauvegarde du dossier (crée la ligne si besoin) avant
      // de rattacher le lead + créneau de rappel.
      await saveDossierAction({ dossierId, funnel, data }).catch(() => null)
      const result = await requestCallback({ dossierId, email, phone, date, slot }).catch(() => ({
        ok: false as const,
      }))
      if (result.ok) setStep('done')
      else setError(true)
    })
  }

  const SLOTS: Slot[] = ['matin', 'apres-midi', 'soir']

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTimeout(reset, 200)
      }}
    >
      <DialogContent className="sm:max-w-md">
        {/* Étape 1 — dossier prêt */}
        {step === 'ready' ? (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
                <PartyPopper className="size-6" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('ready.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('ready.body')}
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => setStep('email')}>
              {t('ready.cta')}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </>
        ) : null}

        {/* Étape 2 — email */}
        {step === 'email' ? (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
                <Mail className="size-6" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('email.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('email.body')}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (email.includes('@')) setStep('callback')
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="fin-email">{t('email.label')}</Label>
                <Input
                  id="fin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder={t('email.placeholder')}
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!email.includes('@')}>
                {t('email.cta')}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </form>
          </>
        ) : null}

        {/* Étape 3 — téléphone + date + créneau */}
        {step === 'callback' ? (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
                <Phone className="size-6" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('callback.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('callback.body')}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                confirm()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="fin-phone">{t('callback.phoneLabel')}</Label>
                <Input
                  id="fin-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  required
                  placeholder={t('callback.phonePlaceholder')}
                  className="h-12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fin-date">{t('callback.dateLabel')}</Label>
                <Input
                  id="fin-date"
                  type="date"
                  required
                  min={today}
                  className="h-12"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('callback.slotLabel')}</Label>
                <div role="radiogroup" className="grid grid-cols-3 gap-2">
                  {SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={slot === s}
                      onClick={() => setSlot(s)}
                      className={cn(
                        'rounded-xl border px-2 py-3 text-sm font-medium transition-colors',
                        slot === s
                          ? 'border-pilot-600 bg-pilot-600 text-white'
                          : 'border-line hover:bg-surface-alt bg-white'
                      )}
                    >
                      {t(`callback.slots.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
              {error ? <p className="text-erreur text-sm">{t('error')}</p> : null}
              <Button
                type="submit"
                className="w-full"
                disabled={pending || !phone || !date || !slot}
              >
                <CalendarClock data-icon="inline-start" />
                {t('callback.cta')}
              </Button>
            </form>
          </>
        ) : null}

        {/* Étape 4 — confirmation */}
        {step === 'done' ? (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
                <CheckCircle2 className="size-6" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('done.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('done.body', {
                  date: date.split('-').reverse().join('.'),
                  slot: t(`callback.slots.${slot ?? 'matin'}`),
                })}
              </DialogDescription>
            </DialogHeader>
            <p className="text-ink-500 text-center text-sm leading-relaxed">{t('done.access')}</p>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              {t('done.close')}
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
