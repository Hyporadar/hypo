import { Wordmark } from '@/components/brand/wordmark'
import { UtmCapture } from '@/components/campagne/utm-capture'

// Landing de TEST (campagne Google Ads) : en-tête minimal (logo seul, sans
// navigation qui ferait fuir), capture UTM, pas de footer marketing.
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <UtmCapture />
      <header className="border-line border-b">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center px-6">
          <Wordmark />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
