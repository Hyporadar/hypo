import type { Metadata } from 'next'
import { fontClasses } from '@/app/fonts'
import '@/app/globals.css'

// Panel de test /campagne — français uniquement, hors routing localisé.
// Layout racine autonome (comme /admin) : rend son propre <html>.
export const metadata: Metadata = { title: 'Campagne — leads de test', robots: { index: false } }

export default function CampagneLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontClasses}>
      <body className="bg-paper text-ink-900 min-h-screen antialiased">{children}</body>
    </html>
  )
}
