import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { ContactForm } from '@/components/marketing/contact-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content.contact' })
  return {
    title: t('metaTitle'),
    alternates: localizedAlternates('/contact', locale as Locale),
  }
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('content.contact')

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <div className="max-w-2xl space-y-4">
        <h1 className="font-display text-3xl font-semibold md:text-5xl">{t('title')}</h1>
        <p className="text-ink-700 leading-relaxed">{t('body')}</p>
      </div>
      {/* Formulaire de contact — pleine largeur, seul élément de la page. */}
      <div className="mt-10 max-w-2xl">
        <h2 className="font-display mb-4 text-xl font-semibold">{t('formTitle')}</h2>
        <ContactForm />
      </div>
    </section>
  )
}
