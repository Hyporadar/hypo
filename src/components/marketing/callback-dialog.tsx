'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CircleCheck, PhoneCall } from 'lucide-react'
import { requestCallback } from '@/server/actions/funnels'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const SLOTS = ['matin', 'apres-midi', 'soir'] as const
type Slot = (typeof SLOTS)[number]

// Numéro suisse : 0XX XXX XX XX ou +41 / 0041 suivi de 9 chiffres.
function phoneValid(raw: string): boolean {
  const p = raw.replace(/[\s.\-/()]/g, '')
  return /^(?:\+41|0041)[1-9]\d{8}$/.test(p) || /^0[1-9]\d{8}$/.test(p)
}

// Bouton « être rappelé maintenant » : crée un Lead + Signal CALLBACK_DEMANDE
// qui atterrit dans la file des closers. On capte prénom, nom, téléphone et
// la plage horaire souhaitée pour le rappel.
export function CallbackDialog() {
  const t = useTranslations('home.callback')
  const tf = useTranslations('common.form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const valid = Boolean(firstName.trim() && lastName.trim() && phoneValid(phone) && slot)

  function submit() {
    setTouched(true)
    setError(null)
    if (!valid) return
    startTransition(async () => {
      const res = await requestCallback({
        name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
        slot: slot ?? undefined,
      }).catch(() => ({ ok: false }))
      if (res.ok) setDone(true)
      else setError(tf('genericError'))
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <PhoneCall data-icon="inline-start" />
          {t('button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="space-y-3 py-4 text-center">
            <CircleCheck className="text-pilot-600 mx-auto size-10" strokeWidth={1.5} />
            <p className="text-ink-700 text-sm">{t('success')}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{t('title')}</DialogTitle>
              <DialogDescription>{t('subtitle')}</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cb-firstname">{t('firstName')}</Label>
                  <Input
                    id="cb-firstname"
                    autoComplete="given-name"
                    className="h-12"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-lastname">{t('lastName')}</Label>
                  <Input
                    id="cb-lastname"
                    autoComplete="family-name"
                    className="h-12"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-phone">{t('phone')}</Label>
                <Input
                  id="cb-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="079 123 45 67"
                  className="h-12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-date">{t('whenLabel')}</Label>
                <Input
                  id="cb-date"
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
                      {t(`slots.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
              {touched && !valid ? (
                <p role="alert" className="text-erreur text-sm">
                  {tf('required')}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="text-erreur text-sm">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {t('submit')}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
