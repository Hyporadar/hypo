import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CircleCheck, CircleAlert } from 'lucide-react'
import { formatCHF, formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  robots: { index: false },
}

// Page publique pointée par le QR du certificat PDF.
// Rendue dans la langue du certificat (pas de préfixe de locale : l'URL doit
// être stable et identique dans les trois langues).
export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const certificate = await prisma.certificate.findUnique({ where: { id } }).catch(() => null)
  const locale = certificate?.locale ?? 'fr'
  const t = await getTranslations({ locale, namespace: 'verify' })

  const data = certificate?.data as { maxAffordablePrice?: number } | undefined

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
      <Card className="mt-6">
        <CardContent className="space-y-5 p-6 sm:p-8">
          {certificate ? (
            <>
              <div className="flex items-center gap-3">
                <CircleCheck className="text-pilot-600 size-8 shrink-0" strokeWidth={1.8} />
                <Badge className="bg-pilot-100 text-pilot-700">{t('validBadge')}</Badge>
              </div>
              <p className="text-ink-700 text-sm leading-relaxed">{t('validBody')}</p>
              <dl className="divide-line divide-y text-sm">
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-500">{t('number')}</dt>
                  <dd className="text-data">{certificate.number}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-500">{t('holder')}</dt>
                  <dd className="font-medium">{certificate.holder}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-500">{t('issuedOn')}</dt>
                  <dd className="text-data">{formatDate(certificate.createdAt)}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-500">{t('maxCapacity')}</dt>
                  <dd className="text-data text-pilot-700 font-medium">
                    {formatCHF(data?.maxAffordablePrice ?? 0)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <CircleAlert className="text-erreur size-8 shrink-0" strokeWidth={1.8} />
                <h2 className="font-display text-lg font-semibold">{t('invalidTitle')}</h2>
              </div>
              <p className="text-ink-700 text-sm leading-relaxed">{t('invalidBody')}</p>
            </>
          )}
        </CardContent>
      </Card>
      <p className="text-ink-500 mt-6 text-center text-xs leading-relaxed">{t('footer')}</p>
    </main>
  )
}
