'use client'

import { useTranslations } from 'next-intl'
import { TriangleAlert } from 'lucide-react'
import type { Completeness, DossierSection } from '@/lib/dossier/completeness'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const SECTIONS: DossierSection[] = ['bien', 'emprunteurs', 'hypotheque']

// Triangle discret dans la barre du bas : popover des questions manquantes
// par section, chaque item cliquable → scroll vers la carte + surbrillance.
export function MissingInfoBadge({
  completeness,
  onNavigate,
}: {
  completeness: Completeness
  onNavigate: (questionKey: string) => void
}) {
  const t = useTranslations('wizard')
  if (completeness.missing.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-ambre-700 hover:bg-ambre-50 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors"
          aria-label={t('missing.title')}
        >
          <TriangleAlert className="size-4" />
          <span className="text-data">{completeness.missing.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="max-h-80 w-72 overflow-auto">
        <p className="font-display text-sm font-semibold">{t('missing.title')}</p>
        {SECTIONS.map((section) => {
          const items = completeness.missingBySection[section]
          if (items.length === 0) return null
          return (
            <div key={section} className="mt-3">
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                {t(`sections.${section}`)}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {items.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.key)}
                      className="text-ink-700 hover:text-pilot-700 w-full rounded px-1 py-0.5 text-left text-sm hover:underline"
                    >
                      {t(`questions.${item.key.replace(/#\d+$/, '')}.short`)}
                      {item.key.includes('#') ? ` (${item.key.split('#')[1]})` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
