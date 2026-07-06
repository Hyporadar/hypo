'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { registerAction, type AuthFormState } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const t = useTranslations('auth.register')
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(registerAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t('phone')}</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-ink-500 text-xs">
          {t('passwordHint')}
        </p>
      </div>
      {state.error ? (
        <p role="alert" className="text-erreur text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submit')}
      </Button>
      <p className="text-ink-500 text-center text-sm">
        {t('hasAccount')}{' '}
        <Link href="/connexion" className="text-pilot-600 underline-offset-4 hover:underline">
          {t('toLogin')}
        </Link>
      </p>
    </form>
  )
}
