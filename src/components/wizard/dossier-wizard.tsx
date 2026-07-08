'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Check, CloudUpload } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import { cn } from '@/lib/utils'
import { detectComplexReasons } from '@/lib/dossier/schema'
import type { DossierSection } from '@/lib/dossier/completeness'
import { useDossierWizard } from '@/components/wizard/use-dossier-wizard'
import { BienSection } from '@/components/wizard/bien-section'
import { EmprunteursSection } from '@/components/wizard/emprunteurs-section'
import { HypothequeSection } from '@/components/wizard/hypotheque-section'
import { OffersPanel } from '@/components/wizard/offers-panel'
import { AssistantWidget } from '@/components/wizard/assistant-widget'
import { MissingInfoBadge } from '@/components/wizard/missing-info-badge'
import { Button } from '@/components/ui/button'

const SECTIONS: DossierSection[] = ['bien', 'emprunteurs', 'hypotheque']

/** Section d'appartenance d'une clé de question (clés complétude). */
function sectionOfKey(key: string): DossierSection {
  const base = key.replace(/#\d+$/, '')
  if (base.startsWith('emprunteur')) return 'emprunteurs'
  if (base === 'montantTotal' || base === 'tranchesSouhaitees' || base === 'dateDebut') {
    return 'hypotheque'
  }
  return 'bien'
}

// ─── Assemblage du wizard /dossier ─────────────────────────────────────
// Barre d'étapes en haut, questions à gauche, panneau offres permanent à
// droite (sticky) / bandeau bas (mobile), assistant flottant, badge
// « informations manquantes ». Sections 2 et 3 : lot suivant.
export function DossierWizard({ initialFunnel }: { initialFunnel?: Funnel }) {
  const t = useTranslations('wizard')
  const wizard = useDossierWizard(initialFunnel)
  const [section, setSection] = useState<DossierSection>('bien')
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
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


  function navigateTo(questionKey: string) {
    const target = sectionOfKey(questionKey)
    setSection(target)
    setHighlightKey(null)
    // Reposer la clé au tick suivant pour re-déclencher la surbrillance.
    requestAnimationFrame(() => setHighlightKey(questionKey.replace(/#\d+$/, '')))
  }

  function showOffers() {
    document.getElementById('offres')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
          <div className="flex items-center gap-2">
            <MissingInfoBadge completeness={wizard.completeness} onNavigate={navigateTo} />
            <span
              aria-live="polite"
              className={cn(
                'text-ink-400 hidden items-center gap-1.5 text-xs sm:flex',
                wizard.saving && 'text-pilot-700'
              )}
            >
              <CloudUpload className="size-3.5" />
              {wizard.saving ? t('nav.save') : t('nav.saved')}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {section === 'bien' ? (
            <BienSection
              funnel={wizard.funnel}
              data={wizard.data}
              setBien={wizard.setBien}
              patch={wizard.patch}
              highlightKey={highlightKey}
              onAnswered={() => setHighlightKey(null)}
              complex={complex}
            />
          ) : section === 'emprunteurs' ? (
            <EmprunteursSection
              funnel={wizard.funnel}
              data={wizard.data}
              patch={wizard.patch}
              highlightKey={highlightKey}
            />
          ) : (
            <HypothequeSection
              funnel={wizard.funnel}
              data={wizard.data}
              dossierId={wizard.dossierId}
              patch={wizard.patch}
              highlightKey={highlightKey}
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

        <OffersPanel calibration={wizard.calibration} />
      </div>

      <AssistantWidget
        percent={wizard.completeness.percent}
        minutesLeft={wizard.minutesLeft}
        tips={wizard.tips}
        onShowOffers={showOffers}
      />
    </div>
  )
}
