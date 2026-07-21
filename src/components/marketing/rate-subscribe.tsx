'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { BellRing, CircleCheck } from 'lucide-react'
import { subscribeRateAlert } from '@/server/actions/rate-alerts'
import { cn } from '@/lib/utils'
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
    <div className="border-line flex flex-col gap-5 rounded-[20px] border bg-white px-8 py-7 shadow-[0_1px_2px_rgba(33,30,26,0.04),0_8px_24px_rgba(33,30,26,0.06)] md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="flex items-start gap-3">
        <BellRing className="text-pilot-600 mt-1 hidden size-6 shrink-0 sm:block" strokeWidth={1.8} />
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.01em]">
            {t('subscribeTitle')}
          </h2>
          <p className="text-ink-500 mt-1.5 text-[13px]">{t('subscribeSubtitle')}</p>
        </div>
      </div>

      {done ? (
        <p className="text-pilot-700 flex items-center gap-2 text-sm font-medium">
          <CircleCheck className="size-4" /> {t('subscribeSuccess')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {FREQUENCIES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={frequency === option.value}
                onClick={() => setFrequency(option.value)}
                className={cn(
                  'inline-flex h-[38px] items-center rounded-full border px-4 text-[13px] font-medium transition-colors',
                  frequency === option.value
                    ? 'border-pilot-600 bg-pilot-50 text-pilot-700'
                    : 'border-line-strong text-ink-700 hover:bg-surface-alt'
                )}
              >
                {t(option.key)}
              </button>
            ))}
            <Input
              type="email"
              autoComplete="email"
              placeholder={t('subscribeEmail')}
              aria-label={t('subscribeEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="border-line-strong h-[38px] w-[190px] rounded-full bg-white px-4 text-sm"
            />
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="bg-ink-900 text-paper inline-flex h-[38px] items-center rounded-full px-[22px] text-[13px] font-semibold disabled:opacity-60"
            >
              {t('subscribeCta')}
            </button>
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
