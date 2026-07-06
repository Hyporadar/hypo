import 'server-only'
import type { Locale } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── EmailProvider ─────────────────────────────────────────────────────
// Interface mockée (console.log) — structure prête pour un vrai provider
// (Resend, Postmark…). Chaque envoi est journalisé dans EmailLog : c'est
// aussi la base de l'idempotence du nurturing (jamais deux fois le même
// template au même lead).

export interface OutgoingEmail {
  to: string
  locale: Locale
  template: string // identifiant stable, ex. "abandon-j1"
  subject: string
  body: string // texte simple — un seul CTA par email
  ctaLabel?: string
  ctaUrl?: string
  leadId?: string
}

export interface EmailProvider {
  send(email: OutgoingEmail): Promise<void>
}

class ConsoleEmailProvider implements EmailProvider {
  async send(email: OutgoingEmail): Promise<void> {
    console.log(
      [
        `[email:${email.template}] → ${email.to} (${email.locale})`,
        `  Sujet : ${email.subject}`,
        `  ${email.body.replaceAll('\n', '\n  ')}`,
        email.ctaLabel ? `  [CTA] ${email.ctaLabel} → ${email.ctaUrl}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider()

/** A-t-on déjà envoyé ce template à ce lead ? (idempotence du nurturing) */
export async function alreadySent(leadId: string, template: string): Promise<boolean> {
  const existing = await prisma.emailLog.findFirst({
    where: { leadId, template },
    select: { id: true },
  })
  return existing !== null
}

/** Dernier envoi d'un template à un lead (pour les cadences trimestrielles). */
export async function lastSentAt(leadId: string, template: string): Promise<Date | null> {
  const log = await prisma.emailLog.findFirst({
    where: { leadId, template },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  })
  return log?.sentAt ?? null
}

/** Envoie et journalise. */
export async function sendAndLog(email: OutgoingEmail): Promise<void> {
  await emailProvider.send(email)
  await prisma.emailLog.create({
    data: {
      to: email.to,
      locale: email.locale,
      template: email.template,
      subject: email.subject,
      leadId: email.leadId ?? null,
    },
  })
}
