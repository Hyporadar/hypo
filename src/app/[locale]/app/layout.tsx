import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { auth } from '@/lib/auth'
import { signOutAction } from '@/server/actions/auth'
import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'

export default async function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common.nav')
  // La protection est déjà assurée par le proxy ; la session sert à l'affichage.
  await auth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-line bg-paper sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6">
          <Link href="/app" aria-label="HypoPilot">
            <Wordmark />
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              {t('logout')}
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-12">{children}</main>
    </div>
  )
}
