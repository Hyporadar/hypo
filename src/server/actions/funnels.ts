'use server'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Funnel, Prisma } from '@prisma/client'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import {
  classifyRenewal,
  computeAffordability,
  computeLeadScore,
  computeRenewalSavings,
  estimateMonthlyPayment,
  rateRange,
  renewalFunnel,
} from '@/lib/finance'
import { prisma } from '@/lib/prisma'
import { getReferenceRate10y } from '@/lib/rates'

// ─── Schémas partagés ─────────────────────────────────────────────────

const attributionSchema = z.object({
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  ref: z.string().max(50).optional(),
})

type Attribution = z.infer<typeof attributionSchema>

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
})

// ?ref=CODE → id du partenaire B2B correspondant (insensible à la casse).
async function resolvePartnerId(ref?: string): Promise<string | null> {
  if (!ref) return null
  const partner = await prisma.user.findFirst({
    where: { partnerCode: { equals: ref, mode: 'insensitive' }, role: 'PARTNER' },
    select: { id: true },
  })
  return partner?.id ?? null
}

function utmData(attribution: Attribution) {
  return {
    utmSource: attribution.utmSource ?? null,
    utmMedium: attribution.utmMedium ?? null,
    utmCampaign: attribution.utmCampaign ?? null,
    utmTerm: attribution.utmTerm ?? null,
    utmContent: attribution.utmContent ?? null,
    referrer: attribution.referrer ?? null,
  }
}

// Numéro de certificat lisible et unique : HP-2026-000042.
async function nextCertificateNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.certificate.count()
  return `HP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`
}

// ─── Brouillons (détection des abandons) ──────────────────────────────

const draftSchema = z.object({
  draftId: z.string().uuid(),
  funnel: z.enum(['ACHAT', 'RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID']),
  step: z.number().int().min(0).max(20),
  email: z.string().email().max(200).optional(),
  data: z.record(z.string(), z.unknown()),
})

/** Persiste le brouillon en base — appelé à chaque étape dès que l'email est connu. */
export async function saveDraft(input: z.infer<typeof draftSchema>): Promise<{ ok: boolean }> {
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const locale = (await getLocale()) as Locale
  const { draftId, funnel, step, email, data } = parsed.data

  await prisma.formDraft.upsert({
    where: { id: draftId },
    create: {
      id: draftId,
      funnel: funnel as Funnel,
      locale,
      step,
      email: email ?? null,
      data: data as Prisma.InputJsonValue,
    },
    update: {
      step,
      email: email ?? undefined,
      data: data as Prisma.InputJsonValue,
    },
  })
  return { ok: true }
}

// ─── Funnel ACHAT ─────────────────────────────────────────────────────

const buySchema = contactSchema.extend({
  draftId: z.string().uuid(),
  price: z.number().int().min(50_000).max(100_000_000),
  ownFunds: z.number().int().min(0).max(100_000_000),
  ownFundsPillar2: z.number().int().min(0).max(100_000_000),
  annualGrossIncome: z.number().int().min(1_000).max(100_000_000),
  attribution: attributionSchema,
})

export type BuySubmitResult =
  | { ok: true; certificateId: string; certificateNumber: string }
  | { ok: false; error: 'invalid' | 'server' }

export async function submitBuyFunnel(input: z.infer<typeof buySchema>): Promise<BuySubmitResult> {
  const parsed = buySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const d = parsed.data
  if (d.ownFundsPillar2 > d.ownFunds) return { ok: false, error: 'invalid' }

  const locale = (await getLocale()) as Locale

  // Le résultat est recalculé côté serveur — jamais repris du client.
  const result = computeAffordability({
    price: d.price,
    annualGrossIncome: d.annualGrossIncome,
    ownFunds: d.ownFunds,
    ownFundsPillar2: d.ownFundsPillar2,
  })
  const refRate = await getReferenceRate10y()
  const range = rateRange(refRate)
  const loanForMax = Math.max(0, result.maxAffordablePrice - d.ownFunds)
  const monthly = estimateMonthlyPayment(loanForMax, result.maxAffordablePrice, refRate)

  const partnerId = await resolvePartnerId(d.attribution.ref)
  const score = computeLeadScore(d.price, 'ACHAT')

  try {
    const certificate = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          funnel: 'ACHAT',
          status: 'NOUVEAU',
          score,
          locale,
          name: d.name,
          email: d.email.toLowerCase(),
          phone: d.phone ?? null,
          partnerId,
          ...utmData(d.attribution),
        },
      })
      await tx.leadStatusChange.create({
        data: { leadId: lead.id, fromStatus: null, toStatus: 'NOUVEAU' },
      })
      await tx.purchaseProject.create({
        data: {
          leadId: lead.id,
          price: d.price,
          ownFunds: d.ownFunds,
          ownFundsPillar2: d.ownFundsPillar2,
          annualGrossIncome: d.annualGrossIncome,
        },
      })
      const cert = await tx.certificate.create({
        data: {
          number: await nextCertificateNumber(tx),
          leadId: lead.id,
          locale,
          holder: d.name,
          data: {
            price: d.price,
            ownFunds: d.ownFunds,
            ownFundsPillar2: d.ownFundsPillar2,
            annualGrossIncome: d.annualGrossIncome,
            feasible: result.feasible,
            maxAffordablePrice: result.maxAffordablePrice,
            chargeRatio: Math.round(result.chargeRatio * 10_000) / 10_000,
            rateMin: range.min,
            rateMax: range.max,
            referenceRate: refRate,
            monthly: Math.round(monthly),
          },
        },
      })
      await tx.formDraft.updateMany({
        where: { id: d.draftId },
        data: { leadId: lead.id, email: d.email.toLowerCase(), completedAt: new Date() },
      })
      return cert
    })

    return { ok: true, certificateId: certificate.id, certificateNumber: certificate.number }
  } catch (error) {
    console.error('submitBuyFunnel', error)
    return { ok: false, error: 'server' }
  }
}

// ─── Funnel RENOUVELLEMENT ────────────────────────────────────────────

const renewalSchema = contactSchema.extend({
  draftId: z.string().uuid(),
  remainingAmount: z.number().int().min(10_000).max(100_000_000),
  currentRate: z.number().min(0).max(15),
  lender: z.string().min(1).max(120),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  propertyValue: z.number().int().min(50_000).max(100_000_000),
  wantsCallback: z.boolean(),
  attribution: attributionSchema,
})

export type RenewalSubmitResult =
  | { ok: true; classification: 'CHAUD' | 'FROID' | 'TROP_TARD' }
  | { ok: false; error: 'invalid' | 'server' }

/** Seuil de signal « grosse économie » pour la file des closers. */
const GROSSE_ECONOMIE_CHF_AN = 2_400

export async function submitRenewalFunnel(
  input: z.infer<typeof renewalSchema>
): Promise<RenewalSubmitResult> {
  const parsed = renewalSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const d = parsed.data

  const locale = (await getLocale()) as Locale
  const [yearStr, monthStr] = d.endMonth.split('-')
  const endDate = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1))
  const now = new Date()

  const classification = classifyRenewal(endDate, now)
  const funnel = renewalFunnel(endDate, now)
  // Chaud : pipeline immédiat. Froid / trop tard : surveillance (nurturing).
  const status = classification === 'CHAUD' ? 'NOUVEAU' : 'NURTURING'
  const score = computeLeadScore(d.remainingAmount, classification)

  const refRate = await getReferenceRate10y()
  const savings = computeRenewalSavings({
    remainingAmount: d.remainingAmount,
    currentRate: d.currentRate,
    referenceRate: refRate,
  })
  const partnerId = await resolvePartnerId(d.attribution.ref)

  try {
    await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          funnel,
          status,
          score,
          locale,
          name: d.name,
          email: d.email.toLowerCase(),
          phone: d.phone ?? null,
          partnerId,
          ...utmData(d.attribution),
        },
      })
      await tx.leadStatusChange.create({
        data: { leadId: lead.id, fromStatus: null, toStatus: status },
      })
      await tx.mortgage.create({
        data: {
          leadId: lead.id,
          remainingAmount: d.remainingAmount,
          currentRate: d.currentRate,
          currentLender: d.lender,
          endDate,
          type: 'FIXE',
          propertyValue: d.propertyValue,
        },
      })
      if (d.wantsCallback && classification === 'CHAUD') {
        await tx.signal.create({ data: { leadId: lead.id, type: 'CALLBACK_DEMANDE' } })
      }
      if (classification === 'CHAUD' && savings >= GROSSE_ECONOMIE_CHF_AN) {
        await tx.signal.create({ data: { leadId: lead.id, type: 'GROSSE_ECONOMIE' } })
      }
      await tx.formDraft.updateMany({
        where: { id: d.draftId },
        data: { leadId: lead.id, email: d.email.toLowerCase(), completedAt: new Date() },
      })
    })

    return { ok: true, classification }
  } catch (error) {
    console.error('submitRenewalFunnel', error)
    return { ok: false, error: 'server' }
  }
}

// ─── Upload de contrat (option secondaire du funnel renouvellement) ───

const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
const UPLOAD_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
}

export type UploadResult = { ok: true } | { ok: false; error: 'invalid' | 'file' | 'server' }

export async function submitContractUpload(formData: FormData): Promise<UploadResult> {
  const contact = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: undefined,
  })
  if (!contact.success) return { ok: false, error: 'invalid' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'file' }
  const ext = UPLOAD_TYPES[file.type]
  if (!ext || file.size > UPLOAD_MAX_BYTES) return { ok: false, error: 'file' }

  const attribution = attributionSchema.safeParse(
    JSON.parse(String(formData.get('attribution') ?? '{}'))
  )
  const locale = (await getLocale()) as Locale
  const partnerId = await resolvePartnerId(attribution.success ? attribution.data.ref : undefined)

  try {
    const dir = path.join(process.cwd(), 'uploads')
    await mkdir(dir, { recursive: true })
    const filename = `${randomUUID()}${ext}`
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))

    await prisma.$transaction(async (tx) => {
      // Échéance inconnue : un conseiller extrait les données — traité en chaud.
      const lead = await tx.lead.create({
        data: {
          funnel: 'RENOUVELLEMENT_CHAUD',
          status: 'NOUVEAU',
          score: 0,
          locale,
          name: contact.data.name,
          email: contact.data.email.toLowerCase(),
          partnerId,
          ...(attribution.success ? utmData(attribution.data) : {}),
        },
      })
      await tx.leadStatusChange.create({
        data: { leadId: lead.id, fromStatus: null, toStatus: 'NOUVEAU' },
      })
      await tx.document.create({
        data: {
          leadId: lead.id,
          type: 'contrat-hypothecaire',
          url: `/uploads/${filename}`,
        },
      })
      await tx.signal.create({ data: { leadId: lead.id, type: 'CALLBACK_DEMANDE' } })
    })

    return { ok: true }
  } catch (error) {
    console.error('submitContractUpload', error)
    return { ok: false, error: 'server' }
  }
}

// ─── Rappel immédiat (bouton home) ────────────────────────────────────

const callbackSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  attribution: attributionSchema.optional(),
})

export type CallbackResult = { ok: boolean }

export async function requestCallback(
  input: z.infer<typeof callbackSchema>
): Promise<CallbackResult> {
  const parsed = callbackSchema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const locale = (await getLocale()) as Locale
  const attribution = parsed.data.attribution

  try {
    await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          funnel: 'RENOUVELLEMENT_CHAUD',
          status: 'NOUVEAU',
          score: 0,
          locale,
          name: parsed.data.name,
          phone: parsed.data.phone,
          partnerId: await resolvePartnerId(attribution?.ref),
          ...(attribution ? utmData(attribution) : {}),
          utmContent: 'callback-home',
        },
      })
      await tx.leadStatusChange.create({
        data: { leadId: lead.id, fromStatus: null, toStatus: 'NOUVEAU' },
      })
      await tx.signal.create({ data: { leadId: lead.id, type: 'CALLBACK_DEMANDE' } })
    })
    return { ok: true }
  } catch (error) {
    console.error('requestCallback', error)
    return { ok: false }
  }
}
