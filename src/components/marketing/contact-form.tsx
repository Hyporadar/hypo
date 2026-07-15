'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { sendContactMessage } from '@/server/actions/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function ContactForm() {
  const t = useTranslations('content.contact')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const valid = name.trim() && EMAIL_RE.test(email.trim()) && message.trim()

  function submit() {
    setTouched(true)
    if (!valid) return
    setError(false)
    startTransition(async () => {
      const result = await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      }).catch(() => ({ ok: false }))
      if (result.ok) setDone(true)
      else setError(true)
    })
  }

  if (done) {
    return (
      <div className="border-line flex items-start gap-3 rounded-xl border bg-white p-6">
        <span className="bg-pilot-50 text-pilot-700 flex size-9 shrink-0 items-center justify-center rounded-full">
          <CheckCircle2 className="size-5" strokeWidth={1.8} />
        </span>
        <p className="text-ink-700 text-sm leading-relaxed">{t('formSuccess')}</p>
      </div>
    )
  }

  return (
    <form
      className="border-line space-y-4 rounded-xl border bg-white p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">{t('formName')}</Label>
        <Input
          id="contact-name"
          autoComplete="name"
          className="h-12"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">{t('formEmail')}</Label>
        <Input
          id="contact-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-12"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{t('formMessage')}</Label>
        <Textarea
          id="contact-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      {touched && !valid ? <p className="text-erreur text-sm">{t('formError')}</p> : null}
      {error ? <p className="text-erreur text-sm">{t('formError')}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {t('formSubmit')}
      </Button>
    </form>
  )
}
