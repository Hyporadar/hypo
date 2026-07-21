import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { StaticPathname } from '@/i18n/routing'
import { Wordmark } from '@/components/brand/wordmark'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { MobileMenu } from '@/components/layout/mobile-menu'

// Achat / Renouvellement → accueil avec le funnel pré-sélectionné (?funnel=…),
// qui ouvre directement la pop-up du calculateur.
const FUNNEL_NAV: Array<{ key: string; funnel: 'achat' | 'renouvellement' }> = [
  { key: 'buy', funnel: 'achat' },
  { key: 'renew', funnel: 'renouvellement' },
]

const NAV: Array<{ key: string; href: StaticPathname }> = [
  { key: 'howItWorks', href: '/comment-ca-marche' },
  { key: 'rates', href: '/taux' },
]

export async function SiteHeader() {
  const t = await getTranslations('common.nav')

  return (
    <header className="border-line bg-paper sticky top-0 z-40 border-b">
      <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-[18px] md:px-14">
        <div className="flex flex-1 items-center">
          <Link href="/" aria-label="HypoRadar, accueil" className="shrink-0">
            <Wordmark />
          </Link>
        </div>
        {/* Nav centrée : flanquée de deux zones flex-1 égales, jamais de chevauchement */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {FUNNEL_NAV.map((item) => (
            <Link
              key={item.key}
              href={{ pathname: '/', query: { funnel: item.funnel } }}
              className="text-ink-700 hover:text-ink-900 whitespace-nowrap hover:underline"
            >
              {t(item.key)}
            </Link>
          ))}
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
          {/* Menu latéral sur mobile (nav masquée < md) */}
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
