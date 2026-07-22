import type { Metadata } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fontClasses } from '@/app/fonts'
import { routing, type Locale } from '@/i18n/routing'
import { BASE_URL, localizedAlternates } from '@/lib/seo'
import '@/app/globals.css'

// Google Ads + Google Analytics 4 (gtag.js) — chargés uniquement sur le site
// public (pas admin/campagne/verify). Une seule lib gtag.js, deux configs.
const GADS_ID = 'AW-18336759881'
const GA4_ID = 'G-5WHBK3XTMH'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  const ogLocale = locale === 'de' ? 'de_CH' : locale === 'it' ? 'it_CH' : 'fr_CH'
  const url = `${BASE_URL}/${locale}`

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: t('title'),
      template: '%s · HypoRadar',
    },
    description: t('description'),
    applicationName: 'HypoRadar',
    keywords: t('keywords').split(',').map((k) => k.trim()),
    alternates: localizedAlternates('/', locale as Locale),
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      type: 'website',
      siteName: 'HypoRadar',
      locale: ogLocale,
      url,
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'metadata' })

  // Données structurées (Organization + WebSite) pour la recherche.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'HypoRadar',
        url: BASE_URL,
        description: t('description'),
        areaServed: { '@type': 'Country', name: 'Switzerland' },
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        name: 'HypoRadar',
        url: `${BASE_URL}/${locale}`,
        inLanguage: locale,
        publisher: { '@id': `${BASE_URL}/#organization` },
      },
    ],
  }

  return (
    <html lang={locale} className={fontClasses}>
      <body className="bg-paper text-ink-900 flex min-h-screen flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>

        {/* Google Ads + Google Analytics 4 (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GADS_ID}');
            gtag('config', '${GA4_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}
