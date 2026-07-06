import Link from 'next/link'
import { computeRenewalSavings } from '@/lib/finance'
import { formatCHF } from '@/lib/format'
import { SIGNAL_LABELS } from '@/lib/admin-labels'
import { prisma } from '@/lib/prisma'
import { getReferenceRate10y } from '@/lib/rates'
import {
  ClaimSignalButton,
  LeadStatusSelect,
  ScheduleDialog,
  TreatSignalButton,
} from '@/components/admin/lead-actions'
import { SignalChrono } from '@/components/admin/signal-chrono'
import { Badge } from '@/components/ui/badge'

// LA file de travail du closer : ses signaux ouverts + le pool non assigné
// (claim). Triée CALLBACK d'abord, puis priorité (score × ancienneté).
export async function SignalQueue({ closerId }: { closerId: string }) {
  const refRate = await getReferenceRate10y()
  const signals = await prisma.signal.findMany({
    where: {
      status: 'OUVERT',
      OR: [
        { lead: { closerId } },
        { claimedById: closerId },
        { lead: { closerId: null }, claimedById: null }, // pool à prendre
      ],
    },
    include: {
      lead: {
        include: {
          mortgage: { select: { remainingAmount: true, currentRate: true } },
          purchaseProject: { select: { price: true } },
        },
      },
    },
  })

  // CALLBACK toujours en tête ; ensuite priorité × ancienneté.
  // eslint-disable-next-line -- horloge volontaire : composant serveur rendu à la requête
  const now = Date.now()
  const sorted = signals.sort((a, b) => {
    const callbackDelta =
      Number(b.type === 'CALLBACK_DEMANDE') - Number(a.type === 'CALLBACK_DEMANDE')
    if (callbackDelta !== 0) return callbackDelta
    const ageA = (now - a.createdAt.getTime()) / 3_600_000
    const ageB = (now - b.createdAt.getTime()) / 3_600_000
    return (b.priority + 1) * (1 + ageB) - (a.priority + 1) * (1 + ageA)
  })

  if (sorted.length === 0) {
    return (
      <p className="border-line text-ink-500 rounded-xl border bg-white py-16 text-center text-sm">
        File vide. Tous les signaux sont traités.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {sorted.map((signal) => {
        const lead = signal.lead
        const amount = Number(lead.mortgage?.remainingAmount ?? lead.purchaseProject?.price ?? 0)
        const savings = lead.mortgage
          ? computeRenewalSavings({
              remainingAmount: Number(lead.mortgage.remainingAmount),
              currentRate: Number(lead.mortgage.currentRate),
              referenceRate: refRate,
            })
          : null
        const mine = lead.closerId === closerId || signal.claimedById === closerId

        return (
          <li
            key={signal.id}
            className="border-line flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-white p-4"
          >
            <SignalChrono createdAt={signal.createdAt.toISOString()} />
            <div className="min-w-44">
              <Badge
                variant="secondary"
                className={
                  signal.type === 'CALLBACK_DEMANDE' ? 'bg-erreur-bg text-erreur font-semibold' : ''
                }
              >
                {SIGNAL_LABELS[signal.type]}
              </Badge>
              <p className="mt-1.5 text-sm font-medium">
                <Link href={`/admin/leads/${lead.id}`} className="hover:underline">
                  {lead.name ?? lead.email ?? 'Sans nom'}
                </Link>{' '}
                <span className="text-ink-400 text-xs uppercase">{lead.locale}</span>
              </p>
            </div>
            <div className="text-data text-sm">
              {amount > 0 ? formatCHF(amount) : '—'}
              {savings !== null && savings > 0 ? (
                <span className="text-ambre-700 ml-2">
                  éco. {formatCHF(Math.round(savings))}/an
                </span>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {mine ? (
                <>
                  <TreatSignalButton signalId={signal.id} />
                  <ScheduleDialog leadId={lead.id} leadName={lead.name ?? ''} />
                  <LeadStatusSelect leadId={lead.id} status={lead.status} compact />
                </>
              ) : (
                <ClaimSignalButton signalId={signal.id} />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
