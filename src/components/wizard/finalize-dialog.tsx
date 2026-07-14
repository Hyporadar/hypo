'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, MailCheck } from 'lucide-react'
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

// Popup de validation de l'offre : message rassurant (offre par email +
// appel du conseiller) puis on ne demande QUE le numéro de téléphone.
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
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  function reset() {
    setStep('form')
    setPhone('')
    setError(false)
  }

  function confirm() {
    if (phone.trim().length < 6) return
    setError(false)
    startTransition(async () => {
      if (testMode) {
        let utm: Record<string, string> | undefined
        try {
          utm = JSON.parse(window.localStorage.getItem('hp-test-utm') ?? 'null') ?? undefined
        } catch {
          utm = undefined
        }
        const result = await submitTestLead({ dossierId, funnel, data, phone, utm }).catch(() => ({
          ok: false as const,
        }))
        if (result.ok) setStep('done')
        else setError(true)
        return
      }
      // Vrai produit : on sauvegarde le dossier puis on rattache le lead.
      await saveDossierAction({ dossierId, funnel, data }).catch(() => null)
      const result = await requestCallback({ dossierId, phone }).catch(() => ({
        ok: false as const,
      }))
      if (result.ok) setStep('done')
      else setError(true)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTimeout(reset, 200)
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
                <MailCheck className="size-6" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('form.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('form.body')}
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
                <Label htmlFor="fin-phone">{t('form.phoneLabel')}</Label>
                <Input
                  id="fin-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  required
                  placeholder={t('form.phonePlaceholder')}
                  className="h-12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {error ? <p className="text-erreur text-sm">{t('error')}</p> : null}
              <Button type="submit" className="w-full" disabled={pending || phone.trim().length < 6}>
                {t('form.cta')}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <span className="bg-pilot-50 text-pilot-700 mx-auto flex size-12 items-center justify-center rounded-full">
                <CheckCircle2 className="size-6" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-center text-xl">{t('done.title')}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {t('done.body')}
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              {t('done.close')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
