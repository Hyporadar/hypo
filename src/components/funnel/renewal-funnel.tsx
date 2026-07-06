'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, CircleCheck, Clock, Flame, Upload } from 'lucide-react'
import { classifyRenewal, computeRenewalSavings, type RenewalClassification } from '@/lib/finance'
import { formatCHF, formatRate } from '@/lib/format'
import { saveDraft, submitContractUpload, submitRenewalFunnel } from '@/server/actions/funnels'
import { FunnelShell } from '@/components/funnel/funnel-shell'
import {
  FieldError,
  MoneyField,
  MonthField,
  PrivacyNote,
  RateField,
  parseRate,
} from '@/components/funnel/inputs'
import { useFunnel } from '@/components/funnel/use-funnel'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const QUESTIONS = 5 // montant → taux → prêteur → échéance → valeur du bien

// Prêteurs proposés dans la liste (le marché suisse le plus courant) + champ libre.
const LENDERS = [
  'UBS',
  'Raiffeisen',
  'PostFinance',
  'Banque Cantonale Vaudoise',
  'Zürcher Kantonalbank',
  'Migros Bank',
  'Swiss Life',
  'AXA',
]
const OTHER = '__other__'

interface RenewalValues extends Record<string, unknown> {
  amount: number | null
  rate: string
  lenderChoice: string
  lenderOther: string
  endMonth: string
  propertyValue: number | null
  name: string
  email: string
  phone: string
  wantsCallback: boolean
}

const INITIAL: RenewalValues = {
  amount: null,
  rate: '',
  lenderChoice: '',
  lenderOther: '',
  endMonth: '',
  propertyValue: null,
  name: '',
  email: '',
  phone: '',
  wantsCallback: false,
}

export function RenewalFunnel({ refRate10y }: { refRate10y: number }) {
  const t = useTranslations('renew')
  const tf = useTranslations('common.form')
  const { step, values, setValue, attribution, draftId, hydrated, next, back, clearDraft } =
    useFunnel<RenewalValues>('renouvellement', INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [doneClassification, setDoneClassification] = useState<RenewalClassification | null>(null)
  const [uploadMode, setUploadMode] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)

  const parsedRate = parseRate(values.rate)
  const lender = values.lenderChoice === OTHER ? values.lenderOther.trim() : values.lenderChoice

  const classification: RenewalClassification | null = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(values.endMonth)) return null
    const [y, m] = values.endMonth.split('-')
    return classifyRenewal(new Date(Date.UTC(Number(y), Number(m) - 1, 1)), new Date())
  }, [values.endMonth])

  const savings = useMemo(() => {
    if (values.amount === null || parsedRate === null) return null
    return computeRenewalSavings({
      remainingAmount: values.amount,
      currentRate: parsedRate,
      referenceRate: refRate10y,
    })
  }, [values.amount, parsedRate, refRate10y])

  function validateAndNext() {
    setError(null)
    if (step === 0 && (values.amount === null || values.amount < 10_000)) {
      setError(tf('invalidNumber'))
      return
    }
    if (step === 1 && parsedRate === null) {
      setError(tf('invalidRate'))
      return
    }
    if (step === 2 && !lender) {
      setError(tf('required'))
      return
    }
    if (step === 3 && !/^\d{4}-\d{2}$/.test(values.endMonth)) {
      setError(tf('invalidDate'))
      return
    }
    if (step === 4 && (values.propertyValue === null || values.propertyValue < 50_000)) {
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
      await saveDraft({
        draftId,
        funnel: classification === 'CHAUD' ? 'RENOUVELLEMENT_CHAUD' : 'RENOUVELLEMENT_FROID',
        step,
        email: values.email,
        data: values,
      })
      const res = await submitRenewalFunnel({
        draftId,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        remainingAmount: values.amount!,
        currentRate: parsedRate!,
        lender,
        endMonth: values.endMonth,
        propertyValue: values.propertyValue!,
        wantsCallback: values.wantsCallback,
        attribution,
      })
      if (res.ok) {
        clearDraft()
        setDoneClassification(res.classification)
        next()
      } else {
        setError(tf('genericError'))
      }
    })
  }

  function submitUpload(form: HTMLFormElement) {
    setError(null)
    startTransition(async () => {
      const fd = new FormData(form)
      fd.set('attribution', JSON.stringify(attribution))
      const res = await submitContractUpload(fd)
      if (res.ok) {
        setUploadDone(true)
      } else {
        setError(res.error === 'file' ? t('upload.fileType') : tf('genericError'))
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

  // ── Option secondaire : upload du contrat
  if (uploadMode) {
    return (
      <FunnelShell current={0} total={0}>
        {uploadDone ? (
          <div className="space-y-4 text-center">
            <CircleCheck className="text-pilot-600 mx-auto size-12" strokeWidth={1.5} />
            <p className="text-ink-700 text-sm leading-relaxed">{t('upload.success')}</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitUpload(e.currentTarget)
            }}
            className="space-y-4"
          >
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                {t('upload.title')}
              </h2>
              <p className="text-ink-700 mt-1 text-sm">{t('upload.subtitle')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-file">{t('upload.file')}</Label>
              <Input
                id="up-file"
                name="file"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                required
              />
              <p className="text-ink-400 text-xs">{t('upload.fileType')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-name">{t('upload.name')}</Label>
              <Input id="up-name" name="name" autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-email">{t('upload.email')}</Label>
              <Input id="up-email" name="email" type="email" autoComplete="email" required />
            </div>
            <FieldError message={error} />
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              <Upload data-icon="inline-start" />
              {t('upload.submit')}
            </Button>
            <PrivacyNote />
          </form>
        )}
      </FunnelShell>
    )
  }

  // ── Écran final selon le routage
  if (doneClassification) {
    const key =
      doneClassification === 'CHAUD' ? 'hot' : doneClassification === 'FROID' ? 'cold' : 'tooLate'
    return (
      <FunnelShell current={QUESTIONS + 2} total={QUESTIONS}>
        <div className="space-y-4 text-center">
          <CircleCheck className="text-pilot-600 mx-auto size-12" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-semibold">{t(`done.${key}Title`)}</h2>
          <p className="text-ink-700 text-sm leading-relaxed">{t(`done.${key}Body`)}</p>
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
            id="amount"
            label={t('steps.amount.label')}
            help={t('steps.amount.help')}
            value={values.amount}
            onChange={(v) => setValue('amount', v)}
          />
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('continue')}
          </Button>
          <button
            type="button"
            onClick={() => setUploadMode(true)}
            className="text-ink-500 hover:text-ink-900 mt-4 block w-full text-center text-sm underline underline-offset-4"
          >
            {t('hero.uploadInstead')}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <RateField
            id="rate"
            label={t('steps.rate.label')}
            help={t('steps.rate.help')}
            value={values.rate}
            onChange={(v) => setValue('rate', v)}
          />
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('continue')}
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <Label htmlFor="lender" className="font-display text-xl leading-snug sm:text-2xl">
            {t('steps.lender.label')}
          </Label>
          <p className="text-ink-500 mt-2 text-sm">{t('steps.lender.help')}</p>
          <div className="mt-4">
            <Select value={values.lenderChoice} onValueChange={(v) => setValue('lenderChoice', v)}>
              <SelectTrigger id="lender" className="h-14 w-full text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENDERS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER}>{t('steps.lender.other')}</SelectItem>
              </SelectContent>
            </Select>
            {values.lenderChoice === OTHER ? (
              <Input
                className="mt-3 h-12"
                placeholder={t('steps.lender.otherPlaceholder')}
                value={values.lenderOther}
                onChange={(e) => setValue('lenderOther', e.target.value)}
              />
            ) : null}
          </div>
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('continue')}
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <MonthField
            id="endMonth"
            label={t('steps.endDate.label')}
            help={t('steps.endDate.help')}
            value={values.endMonth}
            onChange={(v) => setValue('endMonth', v)}
          />
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('continue')}
          </Button>
        </div>
      ) : null}

      {step === 4 ? (
        <div>
          <MoneyField
            id="propertyValue"
            label={t('steps.propertyValue.label')}
            help={t('steps.propertyValue.help')}
            value={values.propertyValue}
            onChange={(v) => setValue('propertyValue', v)}
          />
          <FieldError message={error} />
          <Button size="lg" className="mt-6 w-full" onClick={validateAndNext}>
            {tf('showResult')}
          </Button>
        </div>
      ) : null}

      {step === 5 && savings !== null && parsedRate !== null && classification ? (
        // RÈGLE UX : le résultat (LE moment de conversion) avant toute demande d'email.
        <div className="space-y-6">
          {savings > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ink-500">{t('result.youPay')}</p>
                  <p className="text-data mt-0.5 text-xl">{formatRate(parsedRate)}</p>
                </div>
                <div>
                  <p className="text-ink-500">{t('result.market')}</p>
                  <p className="text-data text-pilot-700 mt-0.5 text-xl">
                    {formatRate(refRate10y)}
                  </p>
                </div>
              </div>
              <div className="border-ambre-500 bg-ambre-50 rounded-xl border p-5">
                <p className="text-ambre-700 text-xs font-semibold tracking-[0.08em] uppercase">
                  {t('result.losing')}
                </p>
                <p className="text-data text-ambre-700 mt-1 text-4xl sm:text-5xl">
                  {formatCHF(Math.round(savings))}
                </p>
                <p className="text-ambre-700 text-data mt-1 text-sm">{t('result.perYear')}</p>
              </div>
              <p className="text-ink-500 text-xs leading-relaxed">
                {t('result.losingNote', { amount: formatCHF(values.amount ?? 0) })}
              </p>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <CircleCheck className="text-pilot-600 mt-0.5 size-7 shrink-0" strokeWidth={1.8} />
              <div>
                <h2 className="font-display text-xl font-semibold sm:text-2xl">
                  {t('result.alreadyGoodTitle')}
                </h2>
                <p className="text-ink-700 mt-1 text-sm leading-relaxed">
                  {t('result.alreadyGoodBody')}
                </p>
              </div>
            </div>
          )}

          {/* Routage automatique selon l'échéance */}
          <div className="border-line rounded-xl border p-5">
            <div className="flex items-start gap-3">
              {classification === 'CHAUD' ? (
                <Flame className="text-ambre-600 mt-0.5 size-6 shrink-0" strokeWidth={1.8} />
              ) : classification === 'FROID' ? (
                <Bell className="text-pilot-600 mt-0.5 size-6 shrink-0" strokeWidth={1.8} />
              ) : (
                <Clock className="text-ink-500 mt-0.5 size-6 shrink-0" strokeWidth={1.8} />
              )}
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {classification === 'CHAUD'
                    ? t('routing.hotTitle')
                    : classification === 'FROID'
                      ? t('routing.coldTitle')
                      : t('routing.tooLateTitle')}
                </h3>
                <p className="text-ink-700 mt-1 text-sm leading-relaxed">
                  {classification === 'CHAUD'
                    ? t('routing.hotBody')
                    : classification === 'FROID'
                      ? t('routing.coldBody')
                      : t('routing.tooLateBody')}
                </p>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={next}>
            {classification === 'CHAUD'
              ? t('routing.hotCta')
              : classification === 'FROID'
                ? t('routing.coldCta')
                : t('routing.tooLateCta')}
          </Button>
        </div>
      ) : null}

      {step >= 6 && classification ? (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">
              {classification === 'CHAUD' ? t('emailGate.hotTitle') : t('emailGate.coldTitle')}
            </h2>
            <p className="text-ink-700 mt-1 text-sm">
              {classification === 'CHAUD'
                ? t('emailGate.hotSubtitle')
                : t('emailGate.coldSubtitle')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-name">{t('emailGate.name')}</Label>
            <Input
              id="r-name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => setValue('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-email">{t('emailGate.email')}</Label>
            <Input
              id="r-email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValue('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-phone">
              {t('emailGate.phone')}
              {classification !== 'CHAUD' ? (
                <span className="text-ink-400 font-normal"> ({tf('optional')})</span>
              ) : null}
            </Label>
            <Input
              id="r-phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => setValue('phone', e.target.value)}
            />
            {classification === 'CHAUD' ? (
              <p className="text-ink-400 text-xs">{t('emailGate.phoneHelp')}</p>
            ) : null}
          </div>
          {classification === 'CHAUD' ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={values.wantsCallback}
                onCheckedChange={(v) => setValue('wantsCallback', v === true)}
              />
              {t('routing.callbackLabel')}
            </label>
          ) : null}
          <FieldError message={error} />
          <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
            {classification === 'CHAUD' ? t('emailGate.hotSubmit') : t('emailGate.coldSubmit')}
          </Button>
          <PrivacyNote />
        </div>
      ) : null}
    </FunnelShell>
  )
}
