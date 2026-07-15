'use server'

import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@prisma/client'
import { sendAndLog } from '@/server/email/provider'

// Formulaire de contact public : envoie un email à l'équipe (journalisé via
// EmailLog). Aucun lead pipeline créé — c'est une simple prise de contact.

const SUPPORT_INBOX = 'contact@hyporadar.ch'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(4000),
})

export type ContactResult = { ok: boolean }

export async function sendContactMessage(input: z.infer<typeof schema>): Promise<ContactResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const locale = (await getLocale()) as Locale
  const { name, email, message } = parsed.data

  try {
    await sendAndLog({
      to: SUPPORT_INBOX,
      locale,
      template: 'contact-form',
      subject: `Contact — ${name}`,
      body: `De : ${name} <${email}>\n\n${message}`,
    })
    return { ok: true }
  } catch (error) {
    console.error('sendContactMessage', error)
    return { ok: false }
  }
}
