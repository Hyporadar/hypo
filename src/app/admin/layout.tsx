import { redirect } from 'next/navigation'
import { fontClasses } from '@/app/fonts'
import { auth } from '@/lib/auth'
import { signOutAction } from '@/server/actions/auth'
import { Wordmark } from '@/components/brand/wordmark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import '@/app/globals.css'

const ROLE_LABELS: Record<string, string> = {
  CLOSER: 'Closer',
  PARTNER: 'Partenaire',
  ADMIN: 'Admin',
}

// Panel interne — français uniquement, hors routing localisé.
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
      <body className="bg-paper text-ink-900 flex min-h-screen flex-col antialiased">
        <header className="border-line bg-paper sticky top-0 z-40 border-b">
          <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Wordmark />
              <span className="text-ink-500 text-sm">Panel interne</span>
              <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ink-500 text-sm">{session.user.name}</span>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Se déconnecter
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-12">{children}</main>
      </body>
    </html>
  )
}
