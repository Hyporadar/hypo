import { setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

// Les trois propositions de la home mènent désormais au Dossier Wizard :
// les montants saisis dans le teaser sont repris depuis le brouillon
// localStorage, il n'y a plus de page intermédiaire.
export default async function RequestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: '/dossier', locale })
}
