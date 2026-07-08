'use client'

import { use, useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

// Connexion par magic link : le token est validé côté serveur par le
// provider 'magic-link' (src/lib/auth.ts) au montage de la page.
export default function MagicLinkPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { locale, token } = use(params)
  const t = useTranslations('magicLink')
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const started = useRef(false)

  useEffect(() => {
    // Garde contre la double invocation de l'effet (StrictMode) : le token
    // est à usage unique, un second appel échouerait à tort.
    if (started.current) return
    started.current = true

    signIn('magic-link', { token, redirectTo: `/${locale}/app`, redirect: false })
      .then((res) => {
        if (res?.ok) {
          window.location.assign(`/${locale}/app`)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [locale, token])

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      {status === 'loading' ? (
        <p className="text-ink-500 text-sm" role="status">
          {t('loading')}
        </p>
      ) : (
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-ink-900 text-2xl font-semibold">{t('errorTitle')}</h1>
          <p className="text-ink-500 text-sm">{t('errorBody')}</p>
          <Link
            href="/connexion"
            className="text-pilot-600 text-sm underline-offset-4 hover:underline"
          >
            {t('errorCta')}
          </Link>
        </div>
      )}
    </main>
  )
}
