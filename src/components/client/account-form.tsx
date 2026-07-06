'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { updateAccount, type AccountFormState } from '@/server/actions/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'

const LOCALE_LABELS: Record<string, string> = { fr: 'Français', de: 'Deutsch', it: 'Italiano' }

export function AccountForm({
  defaults,
}: {
  defaults: {
    name: string
    phone: string
    locale: string
    alertEmail: boolean
    alertSms: boolean
  }
}) {
  const t = useTranslations('clientApp.account')
  const router = useRouter()
  const [locale, setLocale] = useState(defaults.locale)
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    async (prev, fd) => {
      fd.set('locale', locale)
      const res = await updateAccount(prev, fd)
      if (res.ok && locale !== defaults.locale) {
        // La langue du compte pilote les emails et le PDF ; l'UI suit immédiatement.
        router.replace('/app/compte', { locale })
      }
      return res
    },
    {}
  )

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="acc-name">{t('name')}</Label>
        <Input
          id="acc-name"
          name="name"
          defaultValue={defaults.name}
          autoComplete="name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acc-phone">{t('phone')}</Label>
        <Input
          id="acc-phone"
          name="phone"
          defaultValue={defaults.phone}
          type="tel"
          autoComplete="tel"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acc-locale">{t('language')}</Label>
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger id="acc-locale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LOCALE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="border-line space-y-3 rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold">{t('alertsTitle')}</legend>
        <label className="flex items-center justify-between gap-4 text-sm">
          {t('alertEmail')}
          <Switch name="alertEmail" defaultChecked={defaults.alertEmail} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-ink-500">{t('alertSms')}</span>
          <Switch name="alertSms" defaultChecked={defaults.alertSms} disabled />
        </label>
      </fieldset>

      {state.ok ? <p className="text-pilot-700 text-sm">{t('saved')}</p> : null}
      {state.error ? (
        <p role="alert" className="text-erreur text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {t('save')}
      </Button>
    </form>
  )
}
