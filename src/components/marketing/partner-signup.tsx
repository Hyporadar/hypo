'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CircleCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatCHF } from '@/lib/format'
import { submitPartnerSignup } from '@/server/actions/partners'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Base du simulateur de gains : CHF 500/dossier signé, 40% de signature.
const COMMISSION = 500
const SIGN_RATE = 0.4

export function PartnerGainsSimulator() {
  const t = useTranslations('content.partnersPublic')
  const [clients, setClients] = useState(20)
  const gains = useMemo(() => Math.round(clients * SIGN_RATE * COMMISSION), [clients])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{t('simTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        <div className="space-y-2">
          <Label htmlFor="sim-clients">
            {t('simLabel')} : <span className="text-data">{clients}</span>
          </Label>
          <input
            id="sim-clients"
            type="range"
            min={5}
            max={100}
            step={5}
            value={clients}
            onChange={(e) => setClients(Number(e.target.value))}
            className="accent-pilot-600 w-full"
          />
        </div>
        <p className="text-data text-pilot-700 text-3xl">
          {t('simResult', { amount: formatCHF(gains) })}
        </p>
        <p className="text-ink-500 text-xs leading-relaxed">{t('simNote')}</p>
      </CardContent>
    </Card>
  )
}

export function PartnerSignupForm() {
  const t = useTranslations('content.partnersPublic')
  const ta = useTranslations('auth.register')
  const tf = useTranslations('common.form')
  const [values, setValues] = useState({ company: '', email: '', phone: '', password: '' })
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function set(key: keyof typeof values, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await submitPartnerSignup(values)
      if (res.ok) setDone(true)
      else if (res.error === 'email-taken') setError(ta('emailTaken'))
      else setError(tf('genericError'))
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{t('formTitle')}</CardTitle>
        <p className="text-ink-500 text-sm">{t('formSubtitle')}</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {done ? (
          <p className="text-pilot-700 flex items-start gap-2 py-6 text-sm">
            <CircleCheck className="mt-0.5 size-5 shrink-0" />
            {t('success')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ps-company">{t('company')}</Label>
              <Input
                id="ps-company"
                value={values.company}
                onChange={(e) => set('company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-email">{ta('email')}</Label>
              <Input
                id="ps-email"
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-phone">{ta('phone')}</Label>
              <Input
                id="ps-phone"
                type="tel"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-password">{ta('password')}</Label>
              <Input
                id="ps-password"
                type="password"
                minLength={8}
                value={values.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <p className="text-ink-400 text-xs">{ta('passwordHint')}</p>
            </div>
            {error ? (
              <p role="alert" className="text-erreur text-sm">
                {error}
              </p>
            ) : null}
            <Button className="w-full" onClick={submit} disabled={pending}>
              {t('submit')}
            </Button>
            <p className="text-ink-500 text-center text-sm">
              {t('loginHint')}{' '}
              <Link href="/connexion" className="text-pilot-600 hover:underline">
                Login
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
