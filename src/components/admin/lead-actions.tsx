'use client'

import { useState, useTransition } from 'react'
import { Check, PhoneForwarded } from 'lucide-react'
import { STATUT_LABELS } from '@/lib/admin-labels'
import {
  assignCloser,
  changeLeadStatus,
  claimSignal,
  markCommissionPaid,
  saveLeadNotes,
  scheduleAppointment,
  treatSignal,
} from '@/server/actions/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Petits composants d'action du panel — chacun appelle une server action
// qui revérifie le rôle et l'étanchéité côté serveur.

export function LeadStatusSelect({
  leadId,
  status,
  compact = false,
}: {
  leadId: string
  status: string
  compact?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <Select
        value={status}
        onValueChange={(v) =>
          startTransition(async () => {
            setError(null)
            const res = await changeLeadStatus(leadId, v as never)
            if (!res.ok) {
              setError(
                res.error === 'regle-or'
                  ? 'Règle d’or : dossier complet requis avant envoi.'
                  : 'Action refusée.'
              )
            }
          })
        }
      >
        <SelectTrigger
          size="sm"
          className={compact ? 'h-7 w-auto text-xs' : 'w-44'}
          disabled={pending}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-erreur mt-1 text-xs">{error}</p> : null}
    </div>
  )
}

export function AssignCloserSelect({
  leadId,
  closerId,
  closers,
}: {
  leadId: string
  closerId: string | null
  closers: Array<{ id: string; name: string }>
}) {
  const [pending, startTransition] = useTransition()
  const NONE = '__none__'

  return (
    <Select
      value={closerId ?? NONE}
      onValueChange={(v) =>
        startTransition(async () => {
          await assignCloser(leadId, v === NONE ? null : v)
        })
      }
    >
      <SelectTrigger size="sm" className="h-7 w-auto text-xs" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— non assigné</SelectItem>
        {closers.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TreatSignalButton({ signalId }: { signalId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => void (await treatSignal(signalId)))}
    >
      <Check data-icon="inline-start" />
      Traité
    </Button>
  )
}

export function ClaimSignalButton({ signalId }: { signalId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="xs"
      disabled={pending}
      onClick={() => startTransition(async () => void (await claimSignal(signalId)))}
    >
      Prendre
    </Button>
  )
}

export function ScheduleDialog({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [type, setType] = useState<'APPEL' | 'VISIO'>('APPEL')
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="outline">
          <PhoneForwarded data-icon="inline-start" />
          Planifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Planifier un rappel — {leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sched-date">Date et heure</Label>
            <Input
              id="sched-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'APPEL' | 'VISIO')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPEL">Appel</SelectItem>
                <SelectItem value="VISIO">Visio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-notes">Notes</Label>
            <Input id="sched-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={pending || !date}
            onClick={() =>
              startTransition(async () => {
                const res = await scheduleAppointment({ leadId, date, type, notes })
                if (res.ok) setOpen(false)
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NotesEditor({ leadId, initial }: { leadId: string; initial: string }) {
  const [notes, setNotes] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        className="border-input placeholder:text-ink-400 focus-visible:ring-ring/50 w-full rounded-lg border bg-white p-3 text-sm focus-visible:ring-3 focus-visible:outline-none"
        placeholder="Notes internes (visibles closers + admin uniquement)…"
      />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveLeadNotes(leadId, notes)
              if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2500)
              }
            })
          }
        >
          Enregistrer les notes
        </Button>
        {saved ? <span className="text-pilot-700 text-xs">Enregistré.</span> : null}
      </div>
    </div>
  )
}

export function MarkPaidButton({ commissionId }: { commissionId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => void (await markCommissionPaid(commissionId)))}
    >
      Marquer payé
    </Button>
  )
}
