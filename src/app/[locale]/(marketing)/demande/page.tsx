import { setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

// Les trois propositions de la home mènent au parcours court (/dossier/2) :
// les montants saisis dans le teaser sont repris depuis le brouillon
// localStorage. Le parcours long reste disponible sur /dossier mais n'est
// plus mis en avant.
export default async function RequestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: '/dossier/2', locale })
}
