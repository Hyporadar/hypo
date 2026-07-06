import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { LegalPage } from '@/components/marketing/legal-page'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.legal' })
  return {
    title: t('privacyTitle'),
    robots: { index: false },
    alternates: localizedAlternates('/confidentialite', locale as Locale),
  }
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalPage titleKey="privacyTitle" bodyKey="privacyBody" />
}
