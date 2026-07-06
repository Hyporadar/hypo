import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'HypoPilot'

// Image OG générée — wordmark + proposition de valeur, dans la langue de la page.
export default async function OpengraphImage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home.hero' })

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#FAF7F1',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 56, fontWeight: 700 }}>
        <span style={{ color: '#211E1A' }}>Hypo</span>
        <span style={{ color: '#1B6B52' }}>Pilot</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#211E1A',
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          {t('title')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 480, height: 4, background: '#E6E0D4', display: 'flex' }}>
            <div style={{ width: 320, height: 4, background: '#1B6B52' }} />
          </div>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: '#D99A33',
            }}
          />
          <div style={{ fontSize: 28, color: '#96651A', fontWeight: 600 }}>12–18</div>
        </div>
      </div>
    </div>,
    size
  )
}
