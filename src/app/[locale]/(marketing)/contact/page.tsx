import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizedAlternates } from '@/lib/seo'
import { ContactForm } from '@/components/marketing/contact-form'
import { Card, CardContent } from '@/components/ui/card'

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
      <div className="mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Formulaire de contact */}
        <div>
          <h2 className="font-display mb-3 text-lg font-semibold">{t('formTitle')}</h2>
          <ContactForm />
        </div>

        {/* Coordonnées */}
        <Card className="h-fit">
          <CardContent className="space-y-4 p-6 text-sm">
            <div>
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                {t('emailLabel')}
              </p>
              <p className="text-data mt-0.5">contact@hyporadar.ch</p>
            </div>
            <div>
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                {t('phoneLabel')}
              </p>
              <p className="text-data mt-0.5">+41 21 555 00 00</p>
            </div>
            <div>
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                {t('addressLabel')}
              </p>
              <p className="mt-0.5">HypoRadar, Suisse</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
