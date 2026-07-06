import { getTranslations } from 'next-intl/server'
import { Wordmark } from '@/components/brand/wordmark'

export async function SiteFooter() {
  const t = await getTranslations('common.footer')

  return (
    <footer className="bg-pilot-700 text-[#F7F4EC]">
      <div className="mx-auto max-w-[1120px] space-y-6 px-6 py-12">
        <Wordmark onDark />
        <p className="font-display text-lg">{t('transparency')}</p>
        <p className="max-w-xl text-sm text-pilot-200">{t('legal')}</p>
        <p className="text-xs text-pilot-200">
          © {new Date().getFullYear()} {t('copyright')}
        </p>
      </div>
    </footer>
  )
}
