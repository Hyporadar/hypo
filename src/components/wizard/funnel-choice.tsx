'use client'

import { useTranslations } from 'next-intl'
import { Home, RefreshCw } from 'lucide-react'
import type { Funnel } from '@prisma/client'

// Première question, avant tout : achat (nouvelle hypothèque) ou
// renouvellement. Partagée par /dossier (wizard complet) et /dossier/2 (court).
const OPTIONS: Array<{ funnel: Funnel; key: 'achat' | 'renouvellement'; Icon: typeof Home }> = [
  { funnel: 'ACHAT', key: 'achat', Icon: Home },
  { funnel: 'RENOUVELLEMENT_CHAUD', key: 'renouvellement', Icon: RefreshCw },
]

export function FunnelChoice({ onChoose }: { onChoose: (funnel: Funnel) => void }) {
  const t = useTranslations('funnelChoice')

  return (
    <div className="border-line rounded-xl border bg-white p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{t('title')}</h2>
      <p className="text-ink-500 mt-1 text-sm leading-relaxed">{t('subtitle')}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ funnel, key, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChoose(funnel)}
            className="border-line hover:border-pilot-600 hover:bg-surface-alt flex flex-col gap-2 rounded-xl border p-5 text-left transition-colors"
          >
            <span className="bg-pilot-50 text-pilot-700 flex size-10 items-center justify-center rounded-full">
              <Icon className="size-5" strokeWidth={1.8} />
            </span>
            <span className="font-medium">{t(`${key}.label`)}</span>
            <span className="text-ink-500 text-sm leading-relaxed">{t(`${key}.desc`)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
