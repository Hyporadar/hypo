import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { DossierShort } from '@/components/marketing/dossier-short'

export const metadata: Metadata = { robots: { index: false } }

// Variante courte du dossier (/dossier/2) : 3 champs → estimation directe.
export default async function DossierShortPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 md:py-20">
      <DossierShort />
    </section>
  )
}
