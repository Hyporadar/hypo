import { redirect } from 'next/navigation'
import { fontClasses } from '@/app/fonts'
import { auth } from '@/lib/auth'
import { signOutAction } from '@/server/actions/auth'
import { Wordmark } from '@/components/brand/wordmark'
import { AdminNav } from '@/components/admin/admin-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import '@/app/globals.css'

const ROLE_LABELS: Record<string, string> = {
  CLOSER: 'Closer',
  PARTNER: 'Partenaire',
  ADMIN: 'Admin',
}

// Panel interne — français uniquement, hors routing localisé.
// Un seul layout (sidebar + topbar) ; le contenu dépend du rôle.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // Défense en profondeur : le proxy filtre déjà, on revérifie côté serveur.
  if (!session?.user) redirect('/fr/connexion')
  const role = session.user.role
  if (role !== 'CLOSER' && role !== 'PARTNER' && role !== 'ADMIN') {
    redirect(`/${session.user.locale}/app`)
  }

  return (
    <html lang="fr" className={fontClasses}>
      <body className="bg-paper text-ink-900 min-h-screen antialiased">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="border-line hidden w-60 shrink-0 flex-col border-r bg-white px-4 py-5 md:flex">
            <div className="mb-6 flex items-center gap-2 px-3">
              <Wordmark />
              <Badge variant="secondary" className="text-[10px]">
                {ROLE_LABELS[role]}
              </Badge>
            </div>
            <AdminNav role={role} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Topbar */}
            <header className="border-line sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm">
              <div className="flex h-14 items-center justify-between px-6">
                <span className="text-ink-500 text-sm md:hidden">
                  <Wordmark className="text-base" />
                </span>
                <span className="text-ink-500 hidden text-sm md:block">Panel interne</span>
                <div className="flex items-center gap-3">
                  <span className="text-ink-700 text-sm">{session.user.name}</span>
                  <form action={signOutAction}>
                    <Button type="submit" variant="ghost" size="sm">
                      Se déconnecter
                    </Button>
                  </form>
                </div>
              </div>
            </header>
            <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
