import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { DossierWizard } from '@/components/wizard/dossier-wizard'

export const metadata: Metadata = { robots: { index: false } }

// Questionnaire de test : même wizard complet, mais en mode test (aucune
// écriture serveur ; la soumission finale écrit dans TestLead).
export default async function LpQuestionnairePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="mx-auto max-w-[1120px] px-6 pt-6 pb-28 md:pb-16">
      <DossierWizard testMode />
    </section>
  )
}
