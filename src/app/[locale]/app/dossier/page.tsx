import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CircleAlert, CircleCheck, Clock } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { auth } from '@/lib/auth'
import { formatDate, formatRate } from '@/lib/format'
import { getClientLead, missingDocuments } from '@/server/client-data'
import { emitClientEvent } from '@/server/events'
import { DocumentUploadForm } from '@/components/client/document-upload-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function daysLeft(until: Date): number {
  return Math.ceil((until.getTime() - Date.now()) / 86_400_000)
}

export default async function DossierPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('clientApp.dossier')
  const session = await auth()
  const user = session!.user

  const lead = await getClientLead(user.id, user.email ?? '')

  if (!lead) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-ink-700 text-sm">{t('noLead')}</p>
            <Button asChild>
              <Link href="/renouveler">HypoPilot</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const missing = missingDocuments(lead.funnel, lead.documents)
  const activeOffers = lead.offers.filter((o) => o.status === 'ACTIVE')

  // Événement « le client a ouvert ses offres » — consommé par le moteur de signaux.
  if (activeOffers.length > 0) {
    await emitClientEvent({ type: 'OFFRE_OUVERTE', userId: user.id, leadId: lead.id })
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">{t('documentsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6 sm:px-8">
          {missing.length > 0 ? (
            <p className="border-ambre-500 bg-ambre-50 text-ambre-700 flex items-start gap-2 rounded-lg border p-3 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {t('missing', { list: missing.map((m) => t(`docTypes.${m}`)).join(', ') })}
            </p>
          ) : (
            <p className="text-pilot-700 flex items-center gap-2 text-sm">
              <CircleCheck className="size-4" /> {t('complete')}
            </p>
          )}

          {lead.documents.length > 0 ? (
            <ul className="divide-line divide-y">
              {lead.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{t(`docTypes.${doc.type}`)}</span>
                  <Badge
                    variant="secondary"
                    className={
                      doc.verificationStatus === 'VALIDE'
                        ? 'bg-pilot-100 text-pilot-700'
                        : doc.verificationStatus === 'REFUSE'
                          ? 'bg-erreur-bg text-erreur'
                          : ''
                    }
                  >
                    {t(`status.${doc.verificationStatus}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-line border-t pt-6">
            <h3 className="mb-4 text-sm font-semibold">{t('upload')}</h3>
            <DocumentUploadForm missingTypes={missing} />
          </div>
        </CardContent>
      </Card>

      {/* Offres — comparaison côte à côte */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">{t('offersTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8">
          {lead.offers.length === 0 ? (
            <p className="text-ink-500 py-6 text-center text-sm">{t('offersEmpty')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lead.offers.map((offer) => {
                const days = daysLeft(offer.validUntil)
                const expired = offer.status === 'EXPIREE' || days <= 0
                return (
                  <div
                    key={offer.id}
                    className={`rounded-xl border p-5 ${
                      offer.status === 'ACCEPTEE'
                        ? 'border-pilot-600 bg-pilot-50'
                        : expired
                          ? 'border-line bg-surface-alt/40 opacity-60'
                          : 'border-line bg-white'
                    }`}
                  >
                    <p className="font-display font-semibold">{offer.lender}</p>
                    <p className="text-data text-pilot-700 mt-2 text-3xl">
                      {formatRate(Number(offer.rate))}
                    </p>
                    <dl className="text-ink-700 mt-4 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{t('offerTerm')}</dt>
                        <dd className="text-data">
                          {t('offerTermYears', { years: offer.termYears })}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{t('offerValidity')}</dt>
                        <dd
                          className={`text-data flex items-center gap-1 ${
                            !expired && days <= 7 ? 'text-ambre-700 font-semibold' : ''
                          }`}
                        >
                          <Clock className="size-3.5" />
                          {expired ? t('offerExpired') : t('offerDaysLeft', { days })}{' '}
                        </dd>
                      </div>
                    </dl>
                    <Badge variant="secondary" className="mt-4">
                      {t(`offerStatus.${offer.status}`)}
                    </Badge>
                    <p className="text-ink-400 text-data mt-2 text-xs">
                      {formatDate(offer.validUntil)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
