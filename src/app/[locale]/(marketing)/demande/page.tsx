import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'request' })
  return { title: t('metaTitle'), robots: { index: false } }
}

const CATEGORY_KEYS = new Set(['banque', 'assurance', 'caisse-pension'])

// Page de demande détaillée — STUB : le formulaire complet (première partie
// du dossier) sera construit à l'étape suivante. Les montants saisis sur la
// home sont déjà dans le brouillon localStorage.
export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const { type } = await searchParams
  const t = await getTranslations('request')
  const category = CATEGORY_KEYS.has(type ?? '') ? type! : 'banque'

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-display text-3xl leading-[1.1] font-semibold sm:text-4xl">
          {t('title', { category: t(`categories.${category}`) })}
        </h1>
        <p className="text-ink-700 leading-relaxed">{t('subtitle')}</p>
      </div>
      <Card className="mx-auto mt-10 max-w-xl">
        <CardContent className="space-y-6 py-12 text-center">
          <p className="text-ink-500 text-sm leading-relaxed">{t('placeholder')}</p>
          <Button asChild size="lg">
            <Link href="/renouveler">{t('fallbackCta')}</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
