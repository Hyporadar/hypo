'use server'

import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'

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
