'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/app', key: 'dashboard' },
  { href: '/app/dossier', key: 'dossier' },
  { href: '/app/parrainage', key: 'referral' },
  { href: '/app/compte', key: 'account' },
] as const

export function AppNav() {
  const t = useTranslations('clientApp.nav')
  const pathname = usePathname()

  return (
    <nav className="mr-2 hidden items-center gap-1 sm:flex">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm transition-colors',
            pathname === item.href
              ? 'bg-pilot-50 text-pilot-700 font-medium'
              : 'text-ink-700 hover:bg-surface-alt'
          )}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  )
}
