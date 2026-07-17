'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  FolderOpen,
  Handshake,
  Inbox,
  KanbanSquare,
  Percent,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV: Record<
  string,
  Array<{ href: string; label: string; icon: React.ElementType; exact?: boolean }>
> = {
  ADMIN: [
    { href: '/admin', label: 'Vue d’ensemble', icon: Inbox, exact: true },
    { href: '/admin/formulaires', label: 'Leads', icon: UsersRound },
    { href: '/admin/dossiers', label: 'Dossiers', icon: FolderOpen },
    { href: '/admin/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
    { href: '/admin/echeancier', label: 'Échéancier', icon: CalendarClock },
    { href: '/admin/taux', label: 'Taux', icon: Percent },
    { href: '/admin/partenaires', label: 'Partenaires', icon: Handshake },
    { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  ],
  CLOSER: [
    { href: '/admin', label: 'Ma file', icon: Inbox, exact: true },
    { href: '/admin/dossiers', label: 'Dossiers', icon: FolderOpen },
    { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/admin/mes-stats', label: 'Mes stats', icon: BarChart3 },
  ],
  PARTNER: [
    { href: '/admin', label: 'Mes leads', icon: UsersRound, exact: true },
    { href: '/admin/mes-gains', label: 'Mes gains', icon: Wallet },
  ],
}

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname()
  const items = NAV[role] ?? []

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-pilot-50 text-pilot-700 font-medium'
                : 'text-ink-700 hover:bg-surface-alt'
            )}
          >
            <Icon className="size-4" strokeWidth={1.8} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
