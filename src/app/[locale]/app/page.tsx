import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'

export default async function ClientAppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('app')
  const session = await auth()

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
        <p className="text-ink-700">{t('welcome', { name: session?.user.name ?? '' })}</p>
      </div>
      <Card>
        <CardContent className="text-ink-500 py-12 text-center text-sm">{t('empty')}</CardContent>
      </Card>
    </div>
  )
}
