'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import { BASE_URL } from '@/lib/seo'
import { sendAndLog } from '@/server/email/provider'

// Magic link « Sauvegarder mon dossier » — connexion sans mot de passe
// depuis le wizard public. Le token est validé par le provider auth
// 'magic-link' (src/lib/auth.ts) qui crée le compte au premier clic.

const requestSchema = z.object({
  email: z.string().email().max(200),
  dossierId: z.string().min(8).max(64).optional(),
})

const THROTTLE_MS = 60_000 // 1 lien max par minute et par email
const EXPIRY_MS = 60 * 60 * 1000 // valable 1 heure

export type MagicLinkResult = {
  ok: boolean
  error?: 'invalid' | 'throttled' | 'server'
}

export async function requestMagicLink(
  input: z.infer<typeof requestSchema>
): Promise<MagicLinkResult> {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const locale = (await getLocale()) as Locale
  const email = parsed.data.email.toLowerCase()

  try {
    const recent = await prisma.magicLinkToken.findFirst({
      where: { email, usedAt: null, createdAt: { gt: new Date(Date.now() - THROTTLE_MS) } },
      select: { id: true },
    })
    if (recent) return { ok: false, error: 'throttled' }

    const token = crypto.randomUUID()
    await prisma.magicLinkToken.create({
      data: {
        token,
        email,
        dossierId: parsed.data.dossierId ?? null,
        expiresAt: new Date(Date.now() + EXPIRY_MS),
      },
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

    return { ok: true }
  } catch (error) {
    console.error('requestMagicLink', error)
    return { ok: false, error: 'server' }
  }
}
