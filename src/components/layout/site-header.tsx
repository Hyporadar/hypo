import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { StaticPathname } from '@/i18n/routing'
import { Wordmark } from '@/components/brand/wordmark'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'

const NAV: Array<{ key: string; href: StaticPathname }> = [
  { key: 'buy', href: '/acheter' },
  { key: 'renew', href: '/renouveler' },
  { key: 'howItWorks', href: '/comment-ca-marche' },
  { key: 'rates', href: '/taux' },
]

export async function SiteHeader() {
  const t = await getTranslations('common.nav')

  return (
    <header className="border-line bg-paper/95 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-6">
        <div className="flex flex-1 items-center">
          <Link href="/" aria-label="HypoRadar — accueil" className="shrink-0">
            <Wordmark />
          </Link>
        </div>
        {/* Nav centrée : flanquée de deux zones flex-1 égales, jamais de chevauchement */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-ink-700 hover:text-ink-900 whitespace-nowrap hover:underline"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
          {/* Sélecteur de langue compact, tout à droite */}
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  )
}
