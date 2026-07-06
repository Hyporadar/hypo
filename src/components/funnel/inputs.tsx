'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Affichage suisse en cours de frappe : 1250000 → 1'250'000. */
function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

export function parseMoney(display: string): number | null {
  const digits = display.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}

export function parseRate(display: string): number | null {
  const normalized = display.replace(',', '.').replace(/[^\d.]/g, '')
  if (!normalized) return null
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 && n <= 15 ? n : null
}

/** Montant en CHF — clavier numérique, milliers en apostrophe. */
export function MoneyField({
  id,
  label,
  help,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  label: string
  help?: string
  value: number | null
  onChange: (v: number | null) => void
  autoFocus?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-display text-xl leading-snug sm:text-2xl">
        {label}
      </Label>
      {help ? <p className="text-ink-500 text-sm">{help}</p> : null}
      <div className="relative mt-4">
        <span className="text-ink-500 text-data pointer-events-none absolute inset-y-0 left-3 flex items-center text-base">
          CHF
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          className="text-data h-14 pl-14 text-lg"
          value={value === null ? '' : formatThousands(String(value))}
          onChange={(e) => onChange(parseMoney(e.target.value))}
        />
      </div>
    </div>
  )
}

/** Taux en % — accepte virgule ou point. */
export function RateField({
  id,
  label,
  help,
  value,
  onChange,
}: {
  id: string
  label: string
  help?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-display text-xl leading-snug sm:text-2xl">
        {label}
      </Label>
      {help ? <p className="text-ink-500 text-sm">{help}</p> : null}
      <div className="relative mt-4">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="1,45"
          className="text-data h-14 pr-12 text-lg"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
        />
        <span className="text-ink-500 text-data pointer-events-none absolute inset-y-0 right-4 flex items-center text-base">
          %
        </span>
      </div>
    </div>
  )
}

/** Mois d'échéance — input natif type month (mobile-first). */
export function MonthField({
  id,
  label,
  help,
  value,
  onChange,
}: {
  id: string
  label: string
  help?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-display text-xl leading-snug sm:text-2xl">
        {label}
      </Label>
      {help ? <p className="text-ink-500 text-sm">{help}</p> : null}
      <Input
        id={id}
        type="month"
        className="text-data mt-4 h-14 text-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Erreur de validation d'un écran. */
export function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-erreur mt-3 text-sm">
      {message}
    </p>
  )
}

/** Note de confidentialité affichée sous les écrans email. */
export function PrivacyNote() {
  const t = useTranslations('common.form')
  return <p className="text-ink-400 mt-4 text-xs leading-relaxed">{t('privacy')}</p>
}
