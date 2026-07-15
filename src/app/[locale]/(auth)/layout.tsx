import { Link } from '@/i18n/navigation'
import { Wordmark } from '@/components/brand/wordmark'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1120px] items-center px-6">
        <Link href="/" aria-label="HypoRadar — accueil">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">{children}</main>
    </div>
  )
}
