import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Wordmark } from '@/components/brand/wordmark'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { Button } from '@/components/ui/button'

export async function SiteHeader() {
  const t = await getTranslations('common.nav')

  return (
    <header className="border-line bg-paper/95 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-6 px-6">
        <Link href="/" aria-label="HypoPilot — accueil">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/acheter" className="text-ink-700 hover:text-ink-900 hover:underline">
            {t('buy')}
          </Link>
          <Link href="/renouveler" className="text-ink-700 hover:text-ink-900 hover:underline">
            {t('renew')}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">{t('login')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/inscription">{t('register')}</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
