'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CircleCheck, Upload } from 'lucide-react'
import { uploadClientDocument } from '@/server/actions/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function DocumentUploadForm({ missingTypes }: { missingTypes: string[] }) {
  const t = useTranslations('clientApp.dossier')
  const tf = useTranslations('common.form')
  const [docType, setDocType] = useState(missingTypes[0] ?? 'piece-identite')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(form: HTMLFormElement) {
    setError(null)
    startTransition(async () => {
      const fd = new FormData(form)
      fd.set('type', docType)
      const res = await uploadClientDocument(fd)
      if (res.ok) {
        setDone(true)
        form.reset()
        setTimeout(() => setDone(false), 4000)
      } else {
        setError(tf('genericError'))
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="doc-type">{t('uploadType')}</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger id="doc-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                'piece-identite',
                'certificat-salaire',
                'taxation',
                'contrat-hypothecaire',
                'attestation-2e-pilier',
              ].map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`docTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-file">{t('uploadFile')}</Label>
          <Input
            id="doc-file"
            name="file"
            type="file"
            accept=".pdf,image/jpeg,image/png"
            required
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-erreur text-sm">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="text-pilot-700 flex items-center gap-2 text-sm">
          <CircleCheck className="size-4" /> {t('uploadSuccess')}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        <Upload data-icon="inline-start" />
        {t('uploadSubmit')}
      </Button>
    </form>
  )
}
