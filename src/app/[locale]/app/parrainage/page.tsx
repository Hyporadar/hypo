import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { formatCHF, formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'
import { ensureReferralCode } from '@/server/actions/client'
import { CopyLink } from '@/components/client/copy-link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ReferralPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('clientApp.referral')
  const session = await auth()
  const user = session!.user

  const code = await ensureReferralCode()
  const link = `${BASE_URL}/${locale}?ref=${code}`

  const [signedUp, validated, commissions] = await Promise.all([
    prisma.lead.count({ where: { sponsorId: user.id } }),
    prisma.lead.count({ where: { sponsorId: user.id, status: 'SIGNE' } }),
    prisma.commissionEntry.findMany({
      where: { beneficiaryId: user.id, kind: 'PARRAINAGE' },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const total = commissions.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
        <p className="text-ink-700 mt-1">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">{t('yourLink')}</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8">
          <CopyLink url={link} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('signedUp')}
            </p>
            <p className="text-data mt-1 text-4xl">{signedUp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('validated')}
            </p>
            <p className="text-data text-pilot-700 mt-1 text-4xl">{validated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
              {t('earnings')}
            </p>
            <p className="text-data text-pilot-700 mt-1 text-4xl">{formatCHF(total)}</p>
            <p className="text-ink-500 mt-1 text-xs">{t('earningsPerReferral')}</p>
          </CardContent>
        </Card>
      </div>

      {commissions.length > 0 ? (
        <Card>
          <CardContent className="px-6 py-4 sm:px-8">
            <ul className="divide-line divide-y">
              {commissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-data">{formatDate(c.createdAt)}</span>
                  <span className="text-data">{formatCHF(Number(c.amount))}</span>
                  <Badge
                    variant="secondary"
                    className={c.status === 'PAYEE' ? 'bg-pilot-100 text-pilot-700' : ''}
                  >
                    {t(`status.${c.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
