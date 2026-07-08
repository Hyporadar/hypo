import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Funnel } from '@prisma/client'
import { DossierWizard } from '@/components/wizard/dossier-wizard'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'wizard' })
  return { title: t('meta.title'), description: t('meta.description'), robots: { index: false } }
}

const FUNNEL_PARAM: Record<string, Funnel> = {
  achat: 'ACHAT',
  renouvellement: 'RENOUVELLEMENT_CHAUD',
}

// Dossier structuré complet — anonyme (localStorage), offres calibrées en
// temps réel dans le panneau permanent. Préremplissage depuis le teaser home.
export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ funnel?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const { funnel } = await searchParams
  const t = await getTranslations('wizard')

  return (
    <section className="mx-auto max-w-[1120px] px-6 pt-6 pb-28 md:pb-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl leading-[1.15] font-semibold sm:text-3xl">
          {t('meta.title')}
        </h1>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed sm:text-base">
          {t('meta.description')}
        </p>
      </div>
      <div className="mt-6">
        <DossierWizard initialFunnel={funnel ? FUNNEL_PARAM[funnel] : undefined} />
      </div>
    </section>
  )
}
