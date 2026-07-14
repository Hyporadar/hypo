'use server'

import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { dossierDataSchema } from '@/lib/dossier/schema'
import { computeCompleteness } from '@/lib/dossier/completeness'

// Capture d'un formulaire soumis sur le SITE DE TEST (landing /lp). Écrit
// dans TestLead uniquement — aucune interaction avec le vrai produit
// (pas de Dossier, pas de Lead, pas d'email). Sert à mesurer le coût par
// lead des campagnes Google Ads.

const schema = z.object({
  dossierId: z.string().min(8).max(64),
  funnel: z.enum(['ACHAT', 'RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID']),
  data: z.unknown(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).optional(),
  callbackDate: z.string().max(20).optional(),
  callbackSlot: z.string().max(20).optional(),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(160).optional(),
      referrer: z.string().max(300).optional(),
    })
    .optional(),
})

export type TestLeadResult = { ok: boolean }

export async function submitTestLead(input: z.infer<typeof schema>): Promise<TestLeadResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const dataParsed = dossierDataSchema.safeParse(parsed.data.data)
  if (!dataParsed.success) return { ok: false }

  const { dossierId, funnel, email, phone, callbackDate, callbackSlot, utm } = parsed.data
  const completude = computeCompleteness(funnel, dataParsed.data).percent
  const data = dataParsed.data as Prisma.InputJsonValue

  try {
    await prisma.testLead.upsert({
      where: { dossierId },
      create: {
        dossierId,
        funnel,
        completude,
        data,
        email: email ?? null,
        phone: phone ?? null,
        callbackDate: callbackDate ?? null,
        callbackSlot: callbackSlot ?? null,
        utmSource: utm?.source ?? null,
        utmMedium: utm?.medium ?? null,
        utmCampaign: utm?.campaign ?? null,
        referrer: utm?.referrer ?? null,
      },
      update: {
        funnel,
        completude,
        data,
        email: email ?? null,
        phone: phone ?? null,
        callbackDate: callbackDate ?? null,
        callbackSlot: callbackSlot ?? null,
      },
    })
    return { ok: true }
  } catch (error) {
    console.error('submitTestLead', error)
    return { ok: false }
  }
}
