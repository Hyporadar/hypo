'use server'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getLocale, getTranslations } from 'next-intl/server'
import { z } from 'zod'
import type { Locale } from '@/i18n/routing'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitClientEvent } from '@/server/events'
import { ownLeadsWhere } from '@/server/client-data'

// ─── Actions de l'espace client (rôle CLIENT connecté) ────────────────

const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
const UPLOAD_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
}
const DOC_TYPES = new Set([
  'piece-identite',
  'certificat-salaire',
  'taxation',
  'contrat-hypothecaire',
  'attestation-2e-pilier',
])

export type ClientActionResult = { ok: boolean; error?: string }

export async function uploadClientDocument(formData: FormData): Promise<ClientActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'unauthorized' }

  const docType = String(formData.get('type') ?? '')
  if (!DOC_TYPES.has(docType)) return { ok: false, error: 'invalid' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'file' }
  const ext = UPLOAD_TYPES[file.type]
  if (!ext || file.size > UPLOAD_MAX_BYTES) return { ok: false, error: 'file' }

  // Étanchéité : le document ne peut être rattaché qu'à un lead du client.
  const lead = await prisma.lead.findFirst({
    where: {
      ...ownLeadsWhere(session.user.id, session.user.email ?? ''),
      status: { not: 'PERDU' },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!lead) return { ok: false, error: 'no-lead' }

  const dir = path.join(process.cwd(), 'uploads')
  await mkdir(dir, { recursive: true })
  const filename = `${randomUUID()}${ext}`
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))

  await prisma.document.create({
    data: { leadId: lead.id, type: docType, url: `/uploads/${filename}` },
  })
  await emitClientEvent({
    type: 'DOSSIER_MIS_A_JOUR',
    userId: session.user.id,
    leadId: lead.id,
    data: { docType },
  })

  revalidatePath('/[locale]/app/dossier', 'page')
  return { ok: true }
}

const accountSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  locale: z.enum(['fr', 'de', 'it']),
  alertEmail: z.boolean(),
  alertSms: z.boolean(),
})

export type AccountFormState = { ok?: boolean; error?: string }

export async function updateAccount(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const session = await auth()
  if (!session?.user) return { error: 'unauthorized' }
  const t = await getTranslations('common.form')

  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') ?? undefined,
    locale: formData.get('locale'),
    alertEmail: formData.get('alertEmail') === 'on',
    alertSms: formData.get('alertSms') === 'on',
  })
  if (!parsed.success) return { error: t('genericError') }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      locale: parsed.data.locale,
      alertPrefs: { email: parsed.data.alertEmail, sms: parsed.data.alertSms },
    },
  })

  revalidatePath('/[locale]/app/compte', 'page')
  return { ok: true }
}

/** Garantit un code de parrainage pour le client (créé au premier passage). */
export async function ensureReferralCode(): Promise<string | null> {
  const session = await auth()
  if (!session?.user) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  })
  if (user?.referralCode) return user.referralCode

  // Code court, lisible, unique (retry sur collision).
  for (let i = 0; i < 5; i++) {
    const code = `HP${randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { referralCode: code },
      })
      return code
    } catch {
      // collision improbable : on retente
    }
  }
  return null
}

/** Le client ouvre sa page d'offres — événement consommé par le moteur de signaux. */
export async function markOffersOpened(leadId: string): Promise<void> {
  const session = await auth()
  if (!session?.user) return
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...ownLeadsWhere(session.user.id, session.user.email ?? '') },
    select: { id: true },
  })
  if (!lead) return
  await emitClientEvent({ type: 'OFFRE_OUVERTE', userId: session.user.id, leadId })
}

/** Locale utilisée pour rediriger après changement de langue. */
export async function currentLocale(): Promise<Locale> {
  return (await getLocale()) as Locale
}
