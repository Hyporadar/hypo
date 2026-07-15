'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Funnel } from '@prisma/client'
import type { DossierSection } from '@/lib/dossier/completeness'
import { useDossierWizard } from '@/components/wizard/use-dossier-wizard'
import { WizardStepper, type StepStatus } from '@/components/wizard/wizard-stepper'
import { FunnelChoice } from '@/components/wizard/funnel-choice'
import { BienSection } from '@/components/wizard/bien-section'
import { EmprunteursSection } from '@/components/wizard/emprunteurs-section'
import { HypothequeSection } from '@/components/wizard/hypotheque-section'
import { EstimationSection } from '@/components/wizard/estimation-section'
import { AssistantWidget } from '@/components/wizard/assistant-widget'
import { Button } from '@/components/ui/button'

// 3 sections de données + 1 étape finale « estimation du taux » (climax
// avant la capture du lead).
const STEPS = ['bien', 'emprunteurs', 'hypotheque', 'estimation'] as const
type Step = (typeof STEPS)[number]
const DATA_SECTIONS: DossierSection[] = ['bien', 'emprunteurs', 'hypotheque']

export function DossierWizard({
  initialFunnel,
  testMode = false,
}: {
  initialFunnel?: Funnel
  /** Site de test (/lp) : aucune écriture serveur, soumission → TestLead. */
  testMode?: boolean
}) {
  const t = useTranslations('wizard')
  const wizard = useDossierWizard(initialFunnel, testMode)
  const [section, setSection] = useState<Step>('bien')
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  // Achat/renouvellement demandé avant tout (sauf si le funnel est déjà connu,
  // ex. entrée via /acheter ou /renouveler qui fixent initialFunnel).
  const [funnelPicked, setFunnelPicked] = useState(Boolean(initialFunnel))
  const trackedSections = useRef(new Set<string>())

  const stepIndex = STEPS.indexOf(section)

  // Chaque section terminée une fois → événement WIZARD_STEP_COMPLETED.
  useEffect(() => {
    if (!wizard.hydrated) return
    for (const s of DATA_SECTIONS) {
      if (wizard.completeness.missingBySection[s].length === 0 && !trackedSections.current.has(s)) {
        trackedSections.current.add(s)
        wizard.trackStep(s)
      }
    }
  }, [wizard])

  if (!wizard.hydrated) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="bg-surface-alt h-10 w-2/3 animate-pulse rounded-xl" />
        <div className="bg-surface-alt h-48 animate-pulse rounded-xl" />
        <div className="bg-surface-alt h-48 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!funnelPicked) {
    return (
      <div className="mx-auto max-w-2xl pt-2">
        <FunnelChoice
          onChoose={(f) => {
            wizard.setFunnel(f)
            setFunnelPicked(true)
          }}
        />
      </div>
    )
  }

  const steps = STEPS.map((s, i) => ({
    key: s,
    label: t(`steps.${s}`),
    status: (i === stepIndex ? 'current' : i < stepIndex ? 'done' : 'todo') as StepStatus,
  }))

  // On ne peut avancer qu'après avoir répondu à toutes les questions requises
  // de l'étape. `estimation` (dernière) n'a pas d'exigence propre.
  const isStepComplete = (s: Step) =>
    s === 'estimation' || wizard.completeness.missingBySection[s as DossierSection].length === 0
  const currentComplete = isStepComplete(section)
  const firstIncomplete = STEPS.findIndex((s) => !isStepComplete(s))
  const maxReachable = firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete

  function goTo(target: Step) {
    if (STEPS.indexOf(target) <= maxReachable) {
      setHighlightKey(null)
      setSection(target)
    }
  }

  // « Suivant » : si l'étape est complète on avance, sinon on met en évidence
  // le premier champ manquant (défilement + surbrillance orange de la carte).
  function handleNext() {
    if (currentComplete) {
      goTo(STEPS[stepIndex + 1] ?? 'estimation')
      return
    }
    const first = wizard.completeness.missingBySection[section as DossierSection]?.[0]?.key
    const base = first ? first.replace(/#.*$/, '') : null
    // Réinitialise puis redéfinit pour re-déclencher le flash à chaque clic.
    setHighlightKey(null)
    setTimeout(() => setHighlightKey(base), 40)
  }

  return (
    <div>
      {/* Stepper « ligne + points » + état de sauvegarde */}
      <div className="border-line sticky top-0 z-20 -mx-6 border-b bg-[--color-paper]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <WizardStepper steps={steps} onSelect={(key) => goTo(key as Step)} />
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
              highlightKey={highlightKey}
              onAnswered={() => undefined}
            />
          ) : section === 'emprunteurs' ? (
            <EmprunteursSection
              funnel={wizard.funnel}
              data={wizard.data}
              patch={wizard.patch}
              highlightKey={highlightKey}
            />
          ) : section === 'hypotheque' ? (
            <HypothequeSection
              funnel={wizard.funnel}
              data={wizard.data}
              patch={wizard.patch}
              highlightKey={highlightKey}
            />
          ) : (
            <EstimationSection
              funnel={wizard.funnel}
              data={wizard.data}
              dossierId={wizard.dossierId}
              testMode={testMode}
            />
          )}

          {/* Navigation bas de section. « Suivant » reste cliquable : s'il
              manque des réponses, il met en évidence le champ manquant. */}
          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0}
                onClick={() => setSection(STEPS[stepIndex - 1] ?? 'bien')}
              >
                <ArrowLeft data-icon="inline-start" />
                {t('nav.back')}
              </Button>
              {stepIndex < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  {t('nav.next')}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : (
                <span className="w-[92px]" aria-hidden />
              )}
            </div>
            {stepIndex < STEPS.length - 1 && !currentComplete ? (
              <p className="text-ambre-700 mt-3 text-center text-xs">
                {t('nav.completeToContinue')}
              </p>
            ) : null}
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
