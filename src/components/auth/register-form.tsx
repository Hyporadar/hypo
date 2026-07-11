'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { googleSignInAction, registerAction, type AuthFormState } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Logo Google officiel (4 couleurs) — inline pour rester auto-suffisant.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4.5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export function RegisterForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const t = useTranslations('auth.register')
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(registerAction, {})

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <>
          <form action={googleSignInAction}>
            <Button type="submit" variant="outline" className="w-full">
              <GoogleIcon />
              {t('googleCta')}
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <span className="bg-line h-px flex-1" />
            <span className="text-ink-400 text-xs">{t('or')}</span>
            <span className="bg-line h-px flex-1" />
          </div>
        </>
      ) : null}

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
      </form>

      <p className="text-ink-500 text-center text-sm">
        {t('hasAccount')}{' '}
        <Link href="/connexion" className="text-pilot-600 underline-offset-4 hover:underline">
          {t('toLogin')}
        </Link>
      </p>
    </div>
  )
}
