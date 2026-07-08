'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

const LOCALE_LABELS: Record<string, string> = {
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

export function LocaleSwitcher() {
  const t = useTranslations('common.language')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  function onChange(next: string) {
    // next-intl persiste le choix via le cookie NEXT_LOCALE lors de la navigation.
    router.replace(
      // @ts-expect-error — params est typé par route ; le pathname courant est toujours valide
      { pathname, params },
      { locale: next }
    )
  }

  return (
    <Select value={locale} onValueChange={onChange}>
      {/* Déclencheur compact : abréviation seule (FR / DE / IT) */}
      <SelectTrigger className="text-data w-auto min-w-0 px-2.5" aria-label={t('label')} size="sm">
        <span className="uppercase">{locale}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
