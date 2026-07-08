'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { cn } from '@/lib/utils'
import { detectComplexReasons } from '@/lib/dossier/schema'
import type { DossierSection } from '@/lib/dossier/completeness'
import { useDossierWizard } from '@/components/wizard/use-dossier-wizard'
import { BienSection } from '@/components/wizard/bien-section'
import { EmprunteursSection } from '@/components/wizard/emprunteurs-section'
import { HypothequeSection } from '@/components/wizard/hypotheque-section'
import { AssistantWidget } from '@/components/wizard/assistant-widget'
import { Button } from '@/components/ui/button'

const SECTIONS: DossierSection[] = ['bien', 'emprunteurs', 'hypotheque']

// ─── Assemblage du wizard /dossier ─────────────────────────────────────
// Barre d'étapes en haut, questions en colonne unique, assistant flottant.
// Sauvegarde locale instantanée (indicateur façon Google Docs).
export function DossierWizard({ initialFunnel }: { initialFunnel?: Funnel }) {
  const t = useTranslations('wizard')
  const wizard = useDossierWizard(initialFunnel)
  const [section, setSection] = useState<DossierSection>('bien')
  const trackedSections = useRef(new Set<string>())

  const complex = detectComplexReasons(wizard.data).length > 0
  const sectionIndex = SECTIONS.indexOf(section)

  // Chaque section terminée une fois → événement WIZARD_STEP_COMPLETED.
  useEffect(() => {
    if (!wizard.hydrated) return
    for (const s of SECTIONS) {
      if (
        wizard.completeness.missingBySection[s].length === 0 &&
        !trackedSections.current.has(s)
      ) {
        trackedSections.current.add(s)
        wizard.trackStep(s)
      }
    }
  }, [wizard])

  function switchFunnel() {
    const target: Funnel = wizard.funnel === 'ACHAT' ? 'RENOUVELLEMENT_CHAUD' : 'ACHAT'
    if (window.confirm(t('nav.switchWarning'))) wizard.setFunnel(target)
  }

  if (!wizard.hydrated) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="bg-surface-alt h-10 w-2/3 animate-pulse rounded-xl" />
        <div className="bg-surface-alt h-48 animate-pulse rounded-xl" />
        <div className="bg-surface-alt h-48 animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Barre d'étapes + état de sauvegarde */}
      <div className="border-line sticky top-0 z-20 -mx-6 border-b bg-[--color-paper]/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <nav aria-label={t('meta.title')} className="flex flex-wrap items-center gap-2">
            {SECTIONS.map((s, i) => {
              const done =
                wizard.completeness.missingBySection[s].length === 0 && s !== section
              return (
                <button
                  key={s}
                  type="button"
                  aria-current={s === section ? 'step' : undefined}
                  onClick={() => setSection(s)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    s === section
                      ? 'border-pilot-600 bg-pilot-600 text-white'
                      : 'border-line text-ink-700 hover:bg-surface-alt bg-white'
                  )}
                >
                  {done ? <Check className="size-3.5" /> : null}
                  {t(`steps.${s}`)}
                  {i < SECTIONS.length - 1 ? null : null}
                </button>
              )
            })}
          </nav>
          {/* État de sauvegarde façon Google Docs : instantané, discret */}
          <span
            aria-live="polite"
            className="text-ink-400 flex shrink-0 items-center gap-1.5 text-xs"
          >
            {wizard.saveStatus === 'saving' ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t('nav.save')}
              </>
            ) : (
              <>
                <Check className="text-pilot-600 size-3.5" />
                {t('nav.saved')}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <div>
          {section === 'bien' ? (
            <BienSection
              funnel={wizard.funnel}
              data={wizard.data}
              setBien={wizard.setBien}
              patch={wizard.patch}
              highlightKey={null}
              onAnswered={() => undefined}
              complex={complex}
            />
          ) : section === 'emprunteurs' ? (
            <EmprunteursSection
              funnel={wizard.funnel}
              data={wizard.data}
              patch={wizard.patch}
              highlightKey={null}
            />
          ) : (
            <HypothequeSection
              funnel={wizard.funnel}
              data={wizard.data}
              dossierId={wizard.dossierId}
              patch={wizard.patch}
              highlightKey={null}
            />
          )}

          {/* Navigation bas de section + bascule de funnel */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={sectionIndex === 0}
              onClick={() => setSection(SECTIONS[sectionIndex - 1] ?? 'bien')}
            >
              <ArrowLeft data-icon="inline-start" />
              {t('nav.back')}
            </Button>
            <button
              type="button"
              onClick={switchFunnel}
              className="text-ink-400 hover:text-pilot-700 text-xs underline-offset-2 hover:underline"
            >
              {wizard.funnel === 'ACHAT' ? t('nav.toRenewal') : t('nav.toBuy')}
            </button>
            <Button
              type="button"
              disabled={sectionIndex === SECTIONS.length - 1}
              onClick={() => setSection(SECTIONS[sectionIndex + 1] ?? 'hypotheque')}
            >
              {t('nav.next')}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>

      <AssistantWidget
        percent={wizard.completeness.percent}
        minutesLeft={wizard.minutesLeft}
        tips={wizard.tips}
      />
    </div>
  )
}
