import Link from 'next/link'
import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/server/admin/guard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function timeOf(d: Date): string {
  return d.toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Rappels planifiés et RDV du closer — vue des 7 prochains jours.
export default async function AgendaPage() {
  const session = await requireRole('ADMIN', 'CLOSER')
  const isCloser = session.user.role === 'CLOSER'

  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 7)

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(isCloser ? { closerId: session.user.id } : {}),
      date: { gte: from, lte: to },
    },
    include: {
      lead: { select: { id: true, name: true, locale: true } },
      closer: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  })

  const days = new Map<string, typeof appointments>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    days.set(dayKey(d), [])
  }
  for (const appt of appointments) {
    const key = dayKey(appt.date)
    if (days.has(key)) days.get(key)!.push(appt)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Agenda</h1>
      <div className="space-y-4">
        {[...days.entries()].map(([key, items]) => (
          <Card key={key}>
            <CardContent className="p-5">
              <p className="text-ink-500 text-data mb-3 text-xs font-semibold">
                {formatDate(new Date(key))}
              </p>
              {items.length === 0 ? (
                <p className="text-ink-400 text-sm">—</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((appt) => (
                    <li key={appt.id} className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-data w-12">{timeOf(appt.date)}</span>
                      <Badge variant="secondary">{appt.type}</Badge>
                      <Link
                        href={`/admin/leads/${appt.lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {appt.lead.name ?? '—'}
                      </Link>
                      <span className="text-data text-ink-400 text-xs uppercase">
                        {appt.lead.locale}
                      </span>
                      {!isCloser ? (
                        <span className="text-ink-500 text-xs">({appt.closer.name})</span>
                      ) : null}
                      {appt.notes ? <span className="text-ink-500">{appt.notes}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
