'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'
import { ECHEANCES, type Echeance } from '@/lib/dossier/echeance'
import { trackFunnel } from '@/lib/track'
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

const SLOTS = ['matin', 'apres-midi', 'soir'] as const
type Slot = (typeof SLOTS)[number]
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

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

// 2e pop-up : après le calculateur, on capte email + téléphone + échéance
// (renouvellement) + créneau de rappel, et on enregistre le lead.
export function HomeContactDialog({
  open,
  onOpenChange,
  dossierId,
  funnel,
  data,
  isRenew,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  dossierId: string
  funnel: Funnel
  data: DossierData
  isRenew: boolean
}) {
  const t = useTranslations('home.leadWidget')
  const tf = useTranslations('wizard.finalize')
  const te = useTranslations('wizard.estimation')
  const ts = useTranslations('dossierShort')

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [echeance, setEcheance] = useState<Echeance | null>(null)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  const emailOk = EMAIL_RE.test(email.trim())
  const phoneOk = phoneValid(phone)
  const echOk = !isRenew || echeance != null
  const valid = emailOk && phoneOk && echOk

  function submit() {
    setTouched(true)
    if (!valid) return
    trackFunnel('contact')
    start(async () => {
      await submitTestLead({
        dossierId,
        funnel,
        data,
        email: email.trim(),
        phone: phone.trim(),
        echeance: isRenew ? (echeance ?? undefined) : undefined,
        callbackDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
        callbackSlot: slot ?? undefined,
        message: message.trim() || undefined,
        utm: readUtm(),
      }).catch(() => null)
      setDone(true)
    })
  }

  function close() {
    onOpenChange(false)
    setTimeout(() => {
      setDone(false)
      setTouched(false)
    }, 200)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        {done ? (
          <DialogHeader>
            <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-14 items-center justify-center rounded-full">
              <CheckCircle2 className="size-7" strokeWidth={1.8} />
            </span>
            <DialogTitle className="text-center text-xl">{t('contactDone')}</DialogTitle>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">{t('contactTitle')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('contactBody')}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="hc-email">{te('emailPlaceholder')}</Label>
                <Input
                  id="hc-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
                {touched && !emailOk ? <p className="text-erreur text-xs">{te('emailError')}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hc-phone">{tf('phone.phoneLabel')}</Label>
                <Input
                  id="hc-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={tf('phone.phonePlaceholder')}
                  className="h-12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
                {touched && !phoneOk ? (
                  <p className="text-erreur text-xs">{tf('phone.phoneError')}</p>
                ) : null}
              </div>

              {isRenew ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{ts('echeance.label')}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ECHEANCES.map((e) => (
                      <button
                        key={e}
                        type="button"
                        aria-pressed={echeance === e}
                        onClick={() => setEcheance(e)}
                        className={cn(
                          'rounded-lg border px-1.5 py-2 text-center text-xs font-medium transition-colors',
                          echeance === e
                            ? 'border-pilot-600 bg-pilot-600 text-white'
                            : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
                        )}
                      >
                        {ts(`echeance.options.${e}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="hc-date">{tf('phone.whenLabel')}</Label>
                <Input
                  id="hc-date"
                  type="date"
                  className="h-12"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
                      {tf(`phone.slots.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hc-msg">{tf('phone.messageLabel')}</Label>
                <Textarea
                  id="hc-msg"
                  rows={2}
                  placeholder={tf('phone.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {t('contactCta')}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
