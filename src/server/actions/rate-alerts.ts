'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'
import { sendAndLog } from '@/server/email/provider'

// Abonnement aux mises à jour de taux (widget home) — un email = un
// abonnement ; se réabonner met à jour la fréquence et la langue.

const subscribeSchema = z.object({
  email: z.string().email().max(200),
  frequency: z.enum(['QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL']),
})

export type RateAlertResult = { ok: boolean; error?: 'invalid' | 'server' }

export async function subscribeRateAlert(
  input: z.infer<typeof subscribeSchema>
): Promise<RateAlertResult> {
  const parsed = subscribeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const locale = (await getLocale()) as Locale
  const email = parsed.data.email.toLowerCase()

  try {
    await prisma.rateSubscription.upsert({
      where: { email },
      create: { email, locale, frequency: parsed.data.frequency },
      update: { frequency: parsed.data.frequency, locale, unsubscribedAt: null },
    })
    return { ok: true }
  } catch (error) {
    console.error('subscribeRateAlert', error)
    return { ok: false, error: 'server' }
  }
}

// Abonnement depuis le wizard /dossier — double opt-in : l'alerte ne part
// jamais sans clic sur le lien de confirmation reçu par email.

const subscribeFromDossierSchema = z.object({
  email: z.string().email().max(200),
  frequency: z.enum(['QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL']),
  dossierId: z.string().min(8).max(64),
})

export type RateAlertFromDossierResult = {
  ok: boolean
  alreadyConfirmed?: boolean
  error?: 'invalid' | 'server'
}

export async function subscribeRateAlertFromDossier(
  input: z.infer<typeof subscribeFromDossierSchema>
): Promise<RateAlertFromDossierResult> {
  const parsed = subscribeFromDossierSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const locale = (await getLocale()) as Locale
  const email = parsed.data.email.toLowerCase()
  const { frequency, dossierId } = parsed.data

  try {
    const existing = await prisma.rateSubscription.findUnique({ where: { email } })

    // Déjà confirmé : simple mise à jour de fréquence, pas de re-email.
    if (existing?.confirmedAt) {
      await prisma.rateSubscription.update({
        where: { email },
        data: { frequency, locale, dossierId, unsubscribedAt: null },
      })
      return { ok: true, alreadyConfirmed: true }
    }

    const confirmToken = crypto.randomUUID()
    await prisma.rateSubscription.upsert({
      where: { email },
      create: { email, locale, frequency, dossierId, confirmToken },
      update: { frequency, locale, dossierId, confirmToken, unsubscribedAt: null },
    })

    const t = await getTranslations({ locale, namespace: 'emails' })
    await sendAndLog({
      to: email,
      locale,
      template: 'rate-alert-confirm',
      subject: t('rateAlertConfirm.subject'),
      body: t('rateAlertConfirm.body'),
      ctaLabel: t('rateAlertConfirm.cta'),
      ctaUrl: `${BASE_URL}/api/alerts/confirm/${confirmToken}`,
    })

    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { id: true },
    })
    if (dossier) {
      await prisma.dossierEvent.create({
        data: {
          dossierId,
          type: 'RATE_ALERT_SUBSCRIBED',
          data: { frequency },
          actorType: 'LEAD',
        },
      })
    }

    return { ok: true }
  } catch (error) {
    console.error('subscribeRateAlertFromDossier', error)
    return { ok: false, error: 'server' }
  }
}
