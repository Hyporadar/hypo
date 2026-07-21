'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { StaticPathname } from '@/i18n/routing'
import { Wordmark } from '@/components/brand/wordmark'
import { cn } from '@/lib/utils'

const FUNNEL_NAV: Array<{ key: string; funnel: 'achat' | 'renouvellement' }> = [
  { key: 'buy', funnel: 'achat' },
  { key: 'renew', funnel: 'renouvellement' },
]

const NAV: Array<{ key: string; href: StaticPathname }> = [
  { key: 'howItWorks', href: '/comment-ca-marche' },
  { key: 'rates', href: '/taux' },
]

// Menu latéral mobile : bouton hamburger + panneau glissant depuis la droite.
export function MobileMenu() {
  const t = useTranslations('common.nav')
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Verrou de défilement du corps quand le panneau est ouvert.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const linkClass =
    'text-ink-900 hover:bg-surface-alt rounded-lg px-3 py-3 text-base font-medium transition-colors'

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={t('openMenu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="text-ink-900 hover:bg-surface-alt -mr-1 flex size-10 items-center justify-center rounded-lg transition-colors"
      >
        <Menu className="size-6" strokeWidth={1.8} />
      </button>

      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-200',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label={t('closeMenu')}
          onClick={close}
          className="bg-ink-900/40 absolute inset-0 h-full w-full"
          tabIndex={open ? 0 : -1}
        />
        <div
          className={cn(
            'bg-paper absolute top-0 left-0 flex h-full w-[82%] max-w-xs flex-col p-5 shadow-2xl transition-transform duration-200 ease-out',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-6 flex items-center justify-between">
            <Wordmark />
            <button
              type="button"
              aria-label={t('closeMenu')}
              onClick={close}
              className="text-ink-700 hover:bg-surface-alt flex size-10 items-center justify-center rounded-lg transition-colors"
            >
              <X className="size-6" strokeWidth={1.8} />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {FUNNEL_NAV.map((item) => (
              <Link
                key={item.key}
                href={{ pathname: '/', query: { funnel: item.funnel } }}
                onClick={close}
                className={linkClass}
              >
                {t(item.key)}
              </Link>
            ))}
            {NAV.map((item) => (
              <Link key={item.key} href={item.href} onClick={close} className={linkClass}>
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
