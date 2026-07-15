import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { StaticPathname } from '@/i18n/routing'
import { Wordmark } from '@/components/brand/wordmark'

const NAV_LINKS: Array<{ key: string; href: StaticPathname }> = [
  { key: 'rates', href: '/taux' },
  { key: 'guides', href: '/guides' },
  { key: 'transparency', href: '/transparence' },
  { key: 'contact', href: '/contact' },
  { key: 'faq', href: '/faq' },
]

const LEGAL_LINKS: Array<{ key: string; href: StaticPathname }> = [
  { key: 'impressum', href: '/impressum' },
  { key: 'privacy', href: '/confidentialite' },
  { key: 'terms', href: '/cgu' },
]

export async function SiteFooter() {
  const t = await getTranslations('common.footer')

  return (
    <footer className="bg-pilot-700 text-[#F7F4EC]">
      <div className="mx-auto max-w-[1120px] space-y-8 px-6 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-md space-y-4">
            <Wordmark onDark />
            <p className="font-display text-lg">{t('transparency')}</p>
            <p className="text-pilot-200 text-sm">{t('legal')}</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-pilot-100 hover:text-white hover:underline"
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-pilot-600 text-pilot-200 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-6 text-xs">
          <span>
            © {new Date().getFullYear()} {t('copyright')}
          </span>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.key} href={link.href} className="hover:text-white hover:underline">
              {t(`nav.${link.key}`)}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
