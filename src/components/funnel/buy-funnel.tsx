'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CircleCheck, CircleAlert, Download } from 'lucide-react'
import { computeAffordability, estimateMonthlyPayment, rateRange } from '@/lib/finance'
import { formatCHF, formatRate } from '@/lib/format'
import { saveDraft, submitBuyFunnel } from '@/server/actions/funnels'
import { FunnelShell } from '@/components/funnel/funnel-shell'
import { FieldError, MoneyField, PrivacyNote } from '@/components/funnel/inputs'
import { useFunnel } from '@/components/funnel/use-funnel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const QUESTIONS = 3 // prix → fonds propres → revenu ; ensuite résultat, email, done

interface BuyValues extends Record<string, unknown> {
  price: number | null
  ownFunds: number | null
  ownFundsPillar2: number | null
  income: number | null
  name: string
  email: string
  phone: string
}

const INITIAL: BuyValues = {
  price: null,
  ownFunds: null,
  ownFundsPillar2: null,
  income: null,
  name: '',
  email: '',
  phone: '',
}

export function BuyFunnel({ refRate10y }: { refRate10y: number }) {
  const t = useTranslations('buy')
  const tf = useTranslations('common.form')
  const { step, values, setValue, attribution, draftId, hydrated, next, back, clearDraft } =
    useFunnel<BuyValues>('achat', INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<{ certificateId: string; certificateNumber: string } | null>(
    null
  )

  const result = useMemo(() => {
    if (values.price === null || values.ownFunds === null || values.income === null) return null
    return computeAffordability({
      price: values.price,
      annualGrossIncome: values.income,
      ownFunds: values.ownFunds,
      ownFundsPillar2: values.ownFundsPillar2 ?? 0,
    })
  }, [values.price, values.ownFunds, values.ownFundsPillar2, values.income])

  const range = rateRange(refRate10y)
  const monthly = result
    ? estimateMonthlyPayment(
        Math.max(0, result.maxAffordablePrice - (values.ownFunds ?? 0)),
        result.maxAffordablePrice,
        refRate10y
      )
    : 0

  function validateAndNext() {
    setError(null)
    if (step === 0 && (values.price === null || values.price < 50_000)) {
      setError(tf('invalidNumber'))
      return
    }
    if (step === 1) {
      if (values.ownFunds === null) {
        setError(tf('invalidNumber'))
        return
      }
      if ((values.ownFundsPillar2 ?? 0) > values.ownFunds) {
        setError(tf('invalidNumber'))
        return
      }
    }
    if (step === 2 && (values.income === null || values.income < 1_000)) {
      setError(tf('invalidNumber'))
      return
    }
    next()
  }

  function submit() {
    setError(null)
    if (values.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(values.email)) {
      setError(tf('invalidEmail'))
      return
    }
    startTransition(async () => {
      // Brouillon persisté en base dès que l'email est connu.
      await saveDraft({
        draftId,
        funnel: 'ACHAT',
        step,
        email: values.email,
        data: values,
      })
      const res = await submitBuyFunnel({
        draftId,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        price: values.price!,
        ownFunds: values.ownFunds!,
        ownFundsPillar2: values.ownFundsPillar2 ?? 0,
        annualGrossIncome: values.income!,
        attribution,
      })
      if (res.ok) {
        clearDraft()
        setDone({ certificateId: res.certificateId, certificateNumber: res.certificateNumber })
        next()
      } else {
        setError(tf('genericError'))
      }
    })
  }

  if (!hydrated) {
    return (
      <FunnelShell current={0} total={QUESTIONS}>
        {null}
      </FunnelShell>
    )
  }

  // ── Écran final : certificat émis
  if (done) {
    return (
      <FunnelShell current={QUESTIONS + 2} total={QUESTIONS}>
        <div className="space-y-5 text-center">
          <CircleCheck className="text-pilot-600 mx-auto size-12" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-semibold">{t('done.title')}</h2>
          <p className="text-ink-700 text-sm leading-relaxed">
            {t('done.body', { number: done.certificateNumber })}
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a
              href={`/api/certificates/${done.certificateId}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <Download data-icon="inline-start" />
              {t('done.download')}
            </a>
          </Button>
          <p className="text-ink-500 text-sm leading-relaxed">{t('done.next')}</p>
        </div>
      </FunnelShell>
    )
  }

  return (
    <FunnelShell
      current={step}
      total={QUESTIONS}
      onBack={step > 0 && step <= QUESTIONS ? back : undefined}
    >
      {step === 0 ? (
        <div>
          <MoneyField
            id="price"
            label={t('steps.price.label')}
            help={t('steps.price.help')}
            value={values.price}
            onChange={(v) => setValue('price', v)}
          />
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('continue')}
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <MoneyField
            id="ownFunds"
            label={t('steps.ownFunds.label')}
            help={t('steps.ownFunds.help')}
            value={values.ownFunds}
            onChange={(v) => setValue('ownFunds', v)}
          />
          <div className="mt-5 space-y-2">
            <Label htmlFor="pillar2" className="text-sm font-medium">
              {t('steps.ownFunds.pillar2Label')}
            </Label>
            <p className="text-ink-500 text-xs">{t('steps.ownFunds.pillar2Help')}</p>
            <div className="relative">
              <span className="text-ink-500 text-data pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                CHF
              </span>
              <Input
                id="pillar2"
                inputMode="numeric"
                className="text-data h-12 pl-14"
                value={
                  values.ownFundsPillar2 === null
                    ? ''
                    : String(values.ownFundsPillar2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
                }
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, '')
                  setValue('ownFundsPillar2', digits ? Number(digits) : null)
                }}
              />
            </div>
          </div>
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('continue')}
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <MoneyField
            id="income"
            label={t('steps.income.label')}
            help={t('steps.income.help')}
            value={values.income}
            onChange={(v) => setValue('income', v)}
          />
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('showResult')}
          </Button>
        </div>
      ) : null}

      {step === 3 && result ? (
        // RÈGLE UX : le résultat s'affiche AVANT toute demande d'email.
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            {result.feasible ? (
              <CircleCheck className="text-pilot-600 mt-0.5 size-7 shrink-0" strokeWidth={1.8} />
            ) : (
              <CircleAlert className="text-ambre-600 mt-0.5 size-7 shrink-0" strokeWidth={1.8} />
            )}
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                {result.feasible ? t('result.feasibleTitle') : t('result.notFeasibleTitle')}
              </h2>
              <p className="text-ink-700 mt-1 text-sm leading-relaxed">
                {result.feasible ? t('result.feasibleBody') : t('result.notFeasibleBody')}
              </p>
            </div>
          </div>

          {!result.feasible ? (
            <ul className="text-ink-700 space-y-1 text-sm">
              {!result.meetsCharge ? <li>— {t('result.reasonCharge')}</li> : null}
              {!result.meetsOwnFunds ? <li>— {t('result.reasonOwnFunds')}</li> : null}
              {!result.meetsHardOwnFunds ? <li>— {t('result.reasonHardOwnFunds')}</li> : null}
            </ul>
          ) : null}

          <div className="border-line bg-surface-alt/50 rounded-xl border p-5">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('result.maxCapacity')}
            </p>
            <p className="text-data text-pilot-700 mt-1 text-3xl sm:text-4xl">
              {formatCHF(result.maxAffordablePrice)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-500">{t('result.rateRange')}</dt>
              <dd className="text-data mt-0.5 text-base">
                {formatRate(range.min)} – {formatRate(range.max)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">{t('result.monthly')}</dt>
              <dd className="text-data mt-0.5 text-base">{formatCHF(Math.round(monthly))}</dd>
            </div>
          </dl>
          <p className="text-ink-400 text-xs">{t('result.monthlyNote')}</p>

          <Button size="lg" className="w-full" onClick={next}>
            {t('result.cta')}
          </Button>
        </div>
      ) : null}

      {step >= 4 ? (
        // L'email ne sert qu'à débloquer le livrable (certificat PDF).
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">
              {t('emailGate.title')}
            </h2>
            <p className="text-ink-700 mt-1 text-sm">{t('emailGate.subtitle')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t('emailGate.name')}</Label>
            <Input
              id="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => setValue('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailGate.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValue('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t('emailGate.phone')}{' '}
              <span className="text-ink-400 font-normal">({tf('optional')})</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => setValue('phone', e.target.value)}
            />
          </div>
          <FieldError message={error} />
          <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
            {t('emailGate.submit')}
          </Button>
          <PrivacyNote />
        </div>
      ) : null}
    </FunnelShell>
  )
}
