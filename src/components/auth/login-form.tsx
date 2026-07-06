'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { loginAction, type AuthFormState } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const t = useTranslations('auth.login')
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(loginAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
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
        {t('noAccount')}{' '}
        <Link href="/inscription" className="text-pilot-600 underline-offset-4 hover:underline">
          {t('toRegister')}
        </Link>
      </p>
    </form>
  )
}
