'use client'

import { useState, useTransition } from 'react'
import { CircleCheck } from 'lucide-react'
import { submitPartnerLead } from '@/server/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PartnerLeadForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [context, setContext] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (name.trim().length < 2 || phone.trim().length < 6) {
      setError('Nom et téléphone requis.')
      return
    }
    startTransition(async () => {
      const res = await submitPartnerLead({
        name: name.trim(),
        phone: phone.trim(),
        context: context.trim() || undefined,
      })
      if (res.ok) {
        setDone(true)
        setName('')
        setPhone('')
        setContext('')
        setTimeout(() => setDone(false), 4000)
      } else {
        setError('Une erreur est survenue.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pl-name">Nom du client</Label>
        <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pl-phone">Téléphone</Label>
        <Input id="pl-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pl-context">Contexte (échéance, projet…)</Label>
        <Input id="pl-context" value={context} onChange={(e) => setContext(e.target.value)} />
      </div>
      {error ? (
        <p role="alert" className="text-erreur text-sm">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="text-pilot-700 flex items-center gap-2 text-sm">
          <CircleCheck className="size-4" /> Client transmis. Un conseiller le rappelle rapidement.
        </p>
      ) : null}
      <Button onClick={submit} disabled={pending}>
        Transmettre le client
      </Button>
    </div>
  )
}
