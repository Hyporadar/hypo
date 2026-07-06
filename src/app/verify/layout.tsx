import { fontClasses } from '@/app/fonts'
import { Wordmark } from '@/components/brand/wordmark'
import '@/app/globals.css'

// Layout racine autonome (hors [locale]) — le contenu est rendu dans la
// langue du certificat vérifié.
export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontClasses}>
      <body className="bg-paper text-ink-900 flex min-h-screen flex-col antialiased">
        <header className="mx-auto flex h-16 w-full max-w-xl items-center px-6">
          <Wordmark />
        </header>
        {children}
      </body>
    </html>
  )
}
