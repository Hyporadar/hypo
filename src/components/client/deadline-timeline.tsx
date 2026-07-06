import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { monthsUntil, SEUIL_CHAUD_MOIS, SEUIL_TROP_TARD_MOIS, wakeUpDate } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'

// Compte à rebours de l'échéance avec jalons : entrée en fenêtre (18 mois),
// dernier préavis (~4 mois), échéance. Rend évident « où j'en suis et
// quelle est la prochaine étape ».
export async function DeadlineTimeline({ endDate }: { endDate: Date }) {
  const t = await getTranslations('clientApp.dashboard.countdown')
  const now = new Date()
  const months = monthsUntil(endDate, now)

  const windowEntry = wakeUpDate(endDate) // échéance − 18 mois
  const lastNotice = new Date(endDate)
  lastNotice.setUTCMonth(lastNotice.getUTCMonth() - SEUIL_TROP_TARD_MOIS)

  const state =
    months >= SEUIL_CHAUD_MOIS ? 'before' : months >= SEUIL_TROP_TARD_MOIS ? 'window' : 'late'

  // Échelle temporelle : du plus ancien jalon visible à l'échéance.
  const start = Math.min(now.getTime(), windowEntry.getTime())
  const span = Math.max(1, endDate.getTime() - start)
  const pos = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - start) / span) * 100))

  const milestones = [
    {
      key: 'windowEntry',
      date: windowEntry,
      color: state === 'before' ? 'bg-ambre-500' : 'bg-pilot-600',
    },
    { key: 'lastNotice', date: lastNotice, color: 'bg-line-strong' },
    { key: 'deadline', date: endDate, color: 'bg-ink-900' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="pt-6" aria-hidden>
        <div className="bg-line relative h-1 w-full rounded-full">
          {/* Progression écoulée */}
          <div
            className="bg-pilot-600 absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pos(now)}%` }}
          />
          {/* Aujourd'hui */}
          <span
            className="border-pilot-600 absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white"
            style={{ left: `${pos(now)}%` }}
          />
          {milestones.map((m) => (
            <span
              key={m.key}
              className={`${m.color} absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full`}
              style={{ left: `${pos(m.date)}%` }}
            />
          ))}
        </div>
        <div className="text-ink-500 relative mt-3 h-9 text-[11px]">
          <span
            className="text-pilot-700 absolute -translate-x-1/2 text-center font-semibold"
            style={{ left: `${pos(now)}%` }}
          >
            {t('today')}
          </span>
          {milestones.map((m) => (
            <span
              key={m.key}
              className="absolute top-4 -translate-x-1/2 text-center whitespace-nowrap"
              style={{ left: `clamp(3.5rem, ${pos(m.date)}%, calc(100% - 3rem))` }}
            >
              {t(m.key)}
              <br />
              <span className="text-data">{formatDate(m.date)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* État courant + prochaine étape */}
      <div
        className={
          state === 'window'
            ? 'border-ambre-500 bg-ambre-50 rounded-xl border p-5'
            : 'border-line bg-surface-alt/50 rounded-xl border p-5'
        }
      >
        <p className="text-data text-ink-500 text-xs">
          {t('monthsLeft', { months: Math.max(0, months) })}
        </p>
        <h3 className="font-display mt-1 text-lg font-semibold">
          {state === 'before'
            ? t('stateBeforeTitle')
            : state === 'window'
              ? t('stateWindowTitle')
              : t('stateLateTitle')}
        </h3>
        <p className="text-ink-700 mt-1 text-sm leading-relaxed">
          {state === 'before'
            ? t('stateBeforeBody', { date: formatDate(windowEntry) })
            : state === 'window'
              ? t('stateWindowBody', { date: formatDate(lastNotice) })
              : t('stateLateBody')}
        </p>
        {state === 'window' ? (
          <Button asChild size="sm" className="mt-4">
            <Link href="/renouveler">{t('stateWindowCta')}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
