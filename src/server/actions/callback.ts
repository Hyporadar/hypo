'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'
import { sendAndLog } from '@/server/email/provider'

// Finalisation du dossier depuis la popup : on capte email + téléphone +
// créneau de rappel, on rattache/crée le Lead interne (JAMAIS envoyé à un
// partenaire), et on envoie le lien d'accès par email. Le closer voit le
// créneau souhaité dans les notes du lead.

const SLOT_LABELS: Record<string, string> = {
  matin: 'Matin (9h–12h)',
  'apres-midi': 'Après-midi (12h–17h)',
  soir: 'Soir (17h–20h)',
}

const schema = z.object({
  dossierId: z.string().min(8).max(64),
  phone: z.string().min(6).max(40),
  email: z.string().email().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: z.enum(['matin', 'apres-midi', 'soir']).optional(),
})

export type CallbackResult = { ok: boolean; error?: 'invalid' | 'server' }

function frDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

export async function requestCallback(input: z.infer<typeof schema>): Promise<CallbackResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const locale = (await getLocale()) as Locale
  const email = parsed.data.email?.toLowerCase() ?? null
  const { dossierId, phone, date, slot } = parsed.data

  try {
    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { id: true, funnel: true, locale: true, leadId: true },
    })
    if (!dossier) return { ok: false, error: 'server' }

    // Note pour le closer : rappel à passer pour valider l'offre.
    const note =
      date && slot
        ? `Rappel souhaité : ${frDate(date)} — ${SLOT_LABELS[slot] ?? slot}`
        : 'Offre à valider — rappel demandé'

    // Lead interne : créé/complété, jamais poussé vers un partenaire.
    if (dossier.leadId) {
      await prisma.lead.update({ where: { id: dossier.leadId }, data: { email, phone, notes: note } })
    } else {
      const lead = await prisma.lead.create({
        data: {
          funnel: dossier.funnel,
          locale: dossier.locale,
          status: 'NOUVEAU',
          email,
          phone,
          notes: note,
        },
      })
      await prisma.dossier.update({ where: { id: dossierId }, data: { leadId: lead.id } })
    }

    await prisma.dossierEvent.create({
      data: {
        dossierId,
        type: 'ACCOUNT_CREATED',
        actorType: 'LEAD',
        data: { email, phone, date: date ?? null, slot: slot ?? null },
      },
    })

    // Lien d'accès par email — seulement si une adresse a été fournie.
    if (email) {
      const token = crypto.randomUUID()
      await prisma.magicLinkToken.create({
        data: { token, email, dossierId, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      })
      const t = await getTranslations({ locale, namespace: 'emails' })
      await sendAndLog({
        to: email,
        locale,
        template: 'magic-link',
        subject: t('magicLink.subject'),
        body: t('magicLink.body'),
        ctaLabel: t('magicLink.cta'),
        ctaUrl: `${BASE_URL}/${locale}/lien-magique/${token}`,
      })
    }

    return { ok: true }
  } catch (error) {
    console.error('requestCallback', error)
    return { ok: false, error: 'server' }
  }
}
