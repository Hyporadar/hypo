import { getTranslations } from 'next-intl/server'

// Gabarit commun des pages légales — contenus placeholder marqués
// « À VALIDER PAR AVOCAT » dans les trois langues.
export async function LegalPage({
  titleKey,
  bodyKey,
}: {
  titleKey: 'impressumTitle' | 'privacyTitle' | 'termsTitle'
  bodyKey: 'impressumBody' | 'privacyBody' | 'termsBody'
}) {
  const t = await getTranslations('content.legal')
  const paragraphs = t(bodyKey).split('|')

  return (
    <section className="mx-auto max-w-2xl px-6 py-14 md:py-20">
      <p className="bg-ambre-50 border-ambre-500 text-ambre-700 mb-8 inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide">
        {t('lawyerNote')}
      </p>
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{t(titleKey)}</h1>
      <div className="mt-8 space-y-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-ink-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}
