'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { BellRing, CircleCheck } from 'lucide-react'
import { subscribeRateAlert } from '@/server/actions/rate-alerts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const FREQUENCIES = [
  { value: 'QUOTIDIEN', key: 'freqDaily' },
  { value: 'HEBDOMADAIRE', key: 'freqWeekly' },
  { value: 'MENSUEL', key: 'freqMonthly' },
] as const

// Abonnement aux mises à jour de taux — fréquence + email (modèle
// « Zins-Update abonnieren » de hypotheke.ch). Envoi par le cron.
export function RateSubscribe() {
  const t = useTranslations('home.leadWidget')
  const tf = useTranslations('common.form')
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]['value']>('HEBDOMADAIRE')
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(tf('invalidEmail'))
      return
    }
    startTransition(async () => {
      const res = await subscribeRateAlert({ email: email.trim(), frequency })
      if (res.ok) setDone(true)
      else setError(tf('genericError'))
    })
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <BellRing className="text-pilot-600 mx-auto size-7" strokeWidth={1.8} />
      <h2 className="font-display mt-3 text-2xl font-semibold">{t('subscribeTitle')}</h2>
      <p className="text-ink-700 mt-1">{t('subscribeSubtitle')}</p>

      {done ? (
        <p className="text-pilot-700 mt-6 flex items-center justify-center gap-2 text-sm">
          <CircleCheck className="size-4" /> {t('subscribeSuccess')}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Fréquence : journalière / hebdomadaire / mensuelle */}
          <div
            role="radiogroup"
            aria-label={t('frequency')}
            className="border-line inline-flex rounded-full border bg-white p-1"
          >
            {FREQUENCIES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={frequency === option.value}
                onClick={() => setFrequency(option.value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm transition-colors',
                  frequency === option.value
                    ? 'bg-pilot-600 font-medium text-white'
                    : 'text-ink-700 hover:bg-surface-alt'
                )}
              >
                {t(option.key)}
              </button>
            ))}
          </div>

          <div className="mx-auto flex max-w-md gap-2">
            <Input
              type="email"
              autoComplete="email"
              placeholder={t('subscribeEmail')}
              aria-label={t('subscribeEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="h-11 rounded-full bg-white px-4"
            />
            <Button size="lg" onClick={submit} disabled={pending}>
              {t('subscribeCta')}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-erreur text-sm">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
