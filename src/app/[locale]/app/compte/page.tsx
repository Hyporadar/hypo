import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AccountForm } from '@/components/client/account-form'
import { Card, CardContent } from '@/components/ui/card'

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('clientApp.account')
  const session = await auth()

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { name: true, phone: true, locale: true, alertPrefs: true },
  })
  const prefs = (user.alertPrefs as { email?: boolean; sms?: boolean } | null) ?? {}

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <AccountForm
            defaults={{
              name: user.name,
              phone: user.phone ?? '',
              locale: user.locale,
              alertEmail: prefs.email ?? true,
              alertSms: prefs.sms ?? false,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
