'use client'

import { Input } from '@/components/ui/input'
import { PropertyIcon, type PropertyIconType } from '@/components/wizard/property-icons'
import { cn } from '@/lib/utils'

/** Affichage suisse en cours de frappe : 650000 → 650'000. */
export function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

export function parseMoney(display: string): number | null {
  const digits = display.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}

/** Deux gros boutons oui/non côte à côte (façon radio). */
export function YesNoToggle({
  value,
  onChange,
  yesLabel,
  noLabel,
  idBase,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  yesLabel: string
  noLabel: string
  idBase: string
}) {
  const buttonClasses = (selected: boolean) =>
    cn(
      'min-h-12 rounded-xl border px-4 text-base font-medium transition-colors',
      'focus-visible:ring-pilot-200 focus-visible:ring-2 focus-visible:outline-none',
      selected
        ? 'border-pilot-600 bg-pilot-600 text-white'
        : 'border-line hover:bg-surface-alt bg-white'
    )
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-3">
      <button
        id={`${idBase}-oui`}
        type="button"
        role="radio"
        aria-checked={value === true}
        onClick={() => onChange(true)}
        className={buttonClasses(value === true)}
      >
        {yesLabel}
      </button>
      <button
        id={`${idBase}-non`}
        type="button"
        role="radio"
        aria-checked={value === false}
        onClick={() => onChange(false)}
        className={buttonClasses(value === false)}
      >
        {noLabel}
      </button>
    </div>
  )
}

/** Montant en CHF — préfixe collé à gauche, milliers en apostrophe pendant la frappe. */
export function AmountInput({
  id,
  value,
  onChange,
  placeholder = "p.ex. 750'000",
  highlight = false,
}: {
  id: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  /** Surligne le champ en ambre (ex. « Corriger » après un contrôle LTV). */
  highlight?: boolean
}) {
  return (
    <div className="flex">
      <span className="text-ink-500 text-data bg-surface-alt border-line flex items-center rounded-l-xl border border-r-0 px-3 text-sm">
        CHF
      </span>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className={cn(
          'text-data h-12 rounded-l-none rounded-r-xl bg-white text-base',
          highlight && 'border-ambre-500 ring-ambre-300 ring-2'
        )}
        value={value === null ? '' : formatThousands(String(value))}
        onChange={(e) => onChange(parseMoney(e.target.value))}
      />
    </div>
  )
}

/** Masque JJ.MM.AAAA : chiffres uniquement, points insérés automatiquement. */
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  return [day, month, year].filter(Boolean).join('.')
}

/** Date réelle au format JJ.MM.AAAA (mois 1-12, jour valide pour le mois). */
function isValidSwissDate(value: string): boolean {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  if (!match) return false
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12) return false
  const daysInMonth = new Date(year, month, 0).getDate()
  return day >= 1 && day <= daysInMonth
}

/** Date au masque JJ.MM.AAAA — hint ambre si la valeur est incomplète ou invalide. */
export function DateInput({
  id,
  value,
  onChange,
  errorLabel,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  /** Texte du hint, ex. « Format attendu : JJ.MM.AAAA » — i18n côté appelant. */
  errorLabel: string
}) {
  const invalid = value !== '' && !isValidSwissDate(value)
  return (
    <div>
      <div className="flex">
        <span className="text-ink-500 bg-surface-alt border-line flex items-center rounded-l-xl border border-r-0 px-3 text-sm">
          Date
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          aria-invalid={invalid || undefined}
          className="text-data h-12 rounded-l-none rounded-r-xl bg-white text-base"
          value={value}
          onChange={(e) => onChange(maskDate(e.target.value))}
        />
      </div>
      {invalid ? <p className="text-ambre-700 mt-1.5 text-sm">{errorLabel}</p> : null}
    </div>
  )
}

/** Année sur 4 chiffres — hint ambre si hors plage une fois les 4 chiffres saisis. */
export function YearInput({
  id,
  value,
  onChange,
  min = 1850,
  max = new Date().getFullYear() + 3,
  errorLabel,
}: {
  id: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  /** Texte du hint, ex. « Entre 1850 et 2029 » — i18n côté appelant. */
  errorLabel: string
}) {
  const outOfRange = value !== null && String(value).length === 4 && (value < min || value > max)
  return (
    <div>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        aria-invalid={outOfRange || undefined}
        className="text-data h-12 rounded-xl bg-white text-base"
        value={value === null ? '' : String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
          onChange(digits ? Number(digits) : null)
        }}
      />
      {outOfRange ? <p className="text-ambre-700 mt-1.5 text-sm">{errorLabel}</p> : null}
    </div>
  )
}

/** Compteur : picto au-dessus, valeur au centre, boutons − / + en dessous. */
export function Counter({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  icon,
  decrementLabel,
  incrementLabel,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  icon?: PropertyIconType
  /** Libellés d'accessibilité des boutons — i18n côté appelant. */
  decrementLabel?: string
  incrementLabel?: string
}) {
  const buttonClasses =
    'border-line-strong text-ink-700 hover:bg-surface-alt flex size-10 items-center justify-center rounded-full border text-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white'
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={`${id}-label`}
      className="border-line flex flex-col items-center gap-2 rounded-xl border bg-white p-4"
    >
      <span id={`${id}-label`} className="text-ink-700 text-sm font-medium">
        {label}
      </span>
      {icon ? <PropertyIcon type={icon} className="size-10" /> : null}
      <span className="text-data text-3xl">{value}</span>
      <div className="flex gap-3">
        <button
          type="button"
          aria-label={decrementLabel}
          disabled={value <= min}
          onClick={() => onChange(Math.max(value - step, min))}
          className={buttonClasses}
        >
          −
        </button>
        <button
          type="button"
          aria-label={incrementLabel}
          disabled={value >= max}
          onClick={() => onChange(Math.min(value + step, max))}
          className={buttonClasses}
        >
          +
        </button>
      </div>
    </div>
  )
}
