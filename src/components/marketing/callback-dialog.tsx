'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CircleCheck, PhoneCall } from 'lucide-react'
import { requestCallback } from '@/server/actions/funnels'
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

// Bouton « être rappelé maintenant » : crée un Lead + Signal CALLBACK_DEMANDE
// qui atterrit immédiatement dans la file de travail des closers.
export function CallbackDialog() {
  const t = useTranslations('home.callback')
  const tf = useTranslations('common.form')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (name.trim().length < 2 || phone.trim().length < 6) {
      setError(tf('required'))
      return
    }
    startTransition(async () => {
      const res = await requestCallback({ name: name.trim(), phone: phone.trim() })
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cb-name">{t('name')}</Label>
                <Input
                  id="cb-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-phone">{t('phone')}</Label>
                <Input
                  id="cb-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-erreur text-sm">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" onClick={submit} disabled={pending}>
                {t('submit')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
