'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Chrome partagé des funnels : barre de progression, une question par écran,
 * bouton retour. Mobile-first — la carte prend toute la largeur sur petit écran.
 */
export function FunnelShell({
  current,
  total,
  onBack,
  children,
}: {
  /** Index de l'écran courant (0-based) ; ≥ total = écrans résultat/email (barre pleine) */
  current: number
  total: number
  onBack?: () => void
  children: React.ReactNode
}) {
  const t = useTranslations('common.form')
  const progress = Math.min(1, (current + 1) / (total + 1))
  const isQuestion = current < total

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        className="bg-surface-alt h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-pilot-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="text-ink-500 mt-2 flex items-center justify-between text-xs">
        {onBack && current > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onBack}
            className="text-ink-500 -ml-2"
          >
            <ArrowLeft data-icon="inline-start" />
            {t('back')}
          </Button>
        ) : (
          <span />
        )}
        {isQuestion ? (
          <span className="text-data">{t('stepOf', { current: current + 1, total })}</span>
        ) : null}
      </div>
      <Card className="mt-4">
        <CardContent className="p-6 sm:p-8">{children}</CardContent>
      </Card>
    </div>
  )
}
