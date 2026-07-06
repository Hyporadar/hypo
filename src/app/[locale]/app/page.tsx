import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Download } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { auth } from '@/lib/auth'
import { computeRenewalSavings } from '@/lib/finance'
import { formatCHF, formatDate, formatRate } from '@/lib/format'
import { getReferenceRate10y } from '@/lib/rates'
import { leadStatusLabel } from '@/lib/lead-status'
import { getClientCertificate, getClientMortgage } from '@/server/client-data'
import { DeadlineTimeline } from '@/components/client/deadline-timeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ClientDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('clientApp.dashboard')
  const session = await auth()
  const user = session!.user

  const [mortgage, certificate, refRate] = await Promise.all([
    getClientMortgage(user.id, user.email ?? ''),
    getClientCertificate(user.id, user.email ?? ''),
    getReferenceRate10y(),
  ])

  const savings = mortgage
    ? computeRenewalSavings({
        remainingAmount: Number(mortgage.remainingAmount),
        currentRate: Number(mortgage.currentRate),
        referenceRate: refRate,
      })
    : 0

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>

      {mortgage ? (
        <>
          {/* Carte principale : mon taux vs le marché */}
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                    {t('yourRate')}
                  </p>
                  <p className="text-data mt-1 text-5xl">
                    {formatRate(Number(mortgage.currentRate))}
                  </p>
                </div>
                <div>
                  <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                    {t('marketRate')}
                  </p>
                  <p className="text-data text-pilot-700 mt-1 text-5xl">{formatRate(refRate)}</p>
                </div>
              </div>
              <p
                className={
                  savings > 0
                    ? 'text-ambre-700 text-data mt-6 text-lg'
                    : 'text-pilot-700 mt-6 text-sm'
                }
              >
                {savings > 0
                  ? t('gapLosing', { amount: formatCHF(Math.round(savings)) })
                  : t('gapGood')}
              </p>
              <p className="text-ink-500 mt-1 text-xs">
                {t('gapLabel', { amount: formatCHF(Number(mortgage.remainingAmount)) })}
              </p>
              <dl className="text-ink-700 border-line mt-6 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                <div>
                  <dt className="text-ink-500 text-xs">{t('lender')}</dt>
                  <dd className="mt-0.5 font-medium">{mortgage.currentLender}</dd>
                </div>
                <div>
                  <dt className="text-ink-500 text-xs">{t('remaining')}</dt>
                  <dd className="text-data mt-0.5">
                    {formatCHF(Number(mortgage.remainingAmount))}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Compte à rebours de l'échéance */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('countdown.title')}</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 sm:px-8">
              <DeadlineTimeline endDate={mortgage.endDate} />
            </CardContent>
          </Card>
        </>
      ) : !certificate ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <h2 className="font-display text-xl font-semibold">{t('noMortgageTitle')}</h2>
            <p className="text-ink-700 mx-auto max-w-md text-sm leading-relaxed">
              {t('noMortgageBody')}
            </p>
            <Button asChild>
              <Link href="/renouveler">{t('noMortgageCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Client ACHAT : certificat re-téléchargeable + statut du dossier */}
      {certificate ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">{t('certificate.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="text-sm">
              <p>
                <span className="text-ink-500">{t('certificate.number')}</span>{' '}
                <span className="text-data">{certificate.number}</span>
              </p>
              <p className="mt-1">
                <span className="text-ink-500">{t('certificate.issuedOn')}</span>{' '}
                <span className="text-data">{formatDate(certificate.createdAt)}</span>
              </p>
              <p className="mt-2">
                <span className="text-ink-500">{t('certificate.dossierStatus')}</span>{' '}
                <Badge variant="secondary">
                  {leadStatusLabel(locale, certificate.lead.status)}
                </Badge>
              </p>
            </div>
            <Button asChild variant="outline">
              <a href={`/api/certificates/${certificate.id}/pdf`} target="_blank" rel="noreferrer">
                <Download data-icon="inline-start" />
                {t('certificate.download')}
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
