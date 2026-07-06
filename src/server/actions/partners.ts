'use server'

import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'

// Inscription publique des apporteurs B2B — compte PARTNER créé non validé,
// activation manuelle par l'admin (/admin/partenaires).

const signupSchema = z.object({
  company: z.string().min(2).max(160),
  email: z.string().email().max(200),
  phone: z.string().min(6).max(30),
  password: z.string().min(8).max(200),
})

export type PartnerSignupResult = { ok: boolean; error?: 'invalid' | 'email-taken' | 'server' }

export async function submitPartnerSignup(
  input: z.infer<typeof signupSchema>
): Promise<PartnerSignupResult> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const locale = (await getLocale()) as Locale

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { ok: false, error: 'email-taken' }

  try {
    // Code d'apport court et unique, dérivé du nom de société.
    const base = parsed.data.company
      .toUpperCase()
      .normalize('NFD')
      .replace(/[^A-Z]/g, '')
      .slice(0, 8)
    let partnerCode = base || 'PARTNER'
    for (let i = 0; i < 5; i++) {
      const taken = await prisma.user.findUnique({ where: { partnerCode } })
      if (!taken) break
      partnerCode = `${base}${randomUUID().replace(/\D/g, '').slice(0, 3)}`
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        name: parsed.data.company,
        phone: parsed.data.phone,
        role: 'PARTNER',
        locale,
        partnerCode,
        partnerApprovedAt: null, // validation manuelle par l'admin
      },
    })
    return { ok: true }
  } catch (error) {
    console.error('submitPartnerSignup', error)
    return { ok: false, error: 'server' }
  }
}
