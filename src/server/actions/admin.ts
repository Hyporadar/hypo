'use server'

import { revalidatePath } from 'next/cache'
import type { LeadStatus, MortgageType } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── Actions du panel interne — chaque action revérifie le rôle ────────

type ActionResult = { ok: boolean; error?: string }

// Barèmes v1 (placeholders documentés — gérés plus finement plus tard) :
const COMMISSION_PARTNER_CHF = 500 // apporteur B2B, par dossier signé
const COMMISSION_CLOSER_CHF = 300 // variable closer, par signature
const COMMISSION_PARRAINAGE_CHF = 100 // parrain client, par filleul validé

const VALID_STATUSES: LeadStatus[] = [
  'NOUVEAU',
  'CONTACTE',
  'RDV',
  'DOSSIER_EN_COURS',
  'DOSSIER_COMPLET',
  'ENVOYE_PARTENAIRE',
  'OFFRES_RECUES',
  'SIGNE',
  'PERDU',
  'NURTURING',
]

async function requireInternal(roles: Array<'ADMIN' | 'CLOSER' | 'PARTNER'>) {
  const session = await auth()
  if (!session?.user || !roles.includes(session.user.role as never)) return null
  return session.user
}

/** ADMIN : assigner (ou retirer) un closer à un lead. */
export async function assignCloser(leadId: string, closerId: string | null): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }

  if (closerId) {
    const closer = await prisma.user.findFirst({ where: { id: closerId, role: 'CLOSER' } })
    if (!closer) return { ok: false, error: 'invalid' }
  }
  await prisma.lead.update({ where: { id: leadId }, data: { closerId } })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/**
 * ADMIN + CLOSER (sur ses leads) : changer le statut d'un lead.
 * Règle d'or : ENVOYE_PARTENAIRE uniquement depuis DOSSIER_COMPLET.
 * À la signature : commissions apporteur / closer / parrain créées.
 */
export async function changeLeadStatus(
  leadId: string,
  toStatus: LeadStatus
): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN', 'CLOSER'])
  if (!user) return { ok: false, error: 'forbidden' }
  if (!VALID_STATUSES.includes(toStatus)) return { ok: false, error: 'invalid' }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, status: true, closerId: true, partnerId: true, sponsorId: true },
  })
  if (!lead) return { ok: false, error: 'not-found' }
  // Étanchéité closer : uniquement ses leads assignés.
  if (user.role === 'CLOSER' && lead.closerId !== user.id) return { ok: false, error: 'forbidden' }

  // Règle d'or produit : jamais de lead brut chez un partenaire externe.
  if (toStatus === 'ENVOYE_PARTENAIRE' && lead.status !== 'DOSSIER_COMPLET') {
    return { ok: false, error: 'regle-or' }
  }
  if (toStatus === lead.status) return { ok: true }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { status: toStatus } })
    await tx.leadStatusChange.create({
      data: { leadId, fromStatus: lead.status, toStatus, changedById: user.id },
    })

    if (toStatus === 'SIGNE') {
      if (lead.partnerId) {
        await tx.commissionEntry.create({
          data: {
            beneficiaryId: lead.partnerId,
            leadId,
            kind: 'APPORT_PARTENAIRE',
            amount: COMMISSION_PARTNER_CHF,
          },
        })
      }
      if (lead.closerId) {
        await tx.commissionEntry.create({
          data: {
            beneficiaryId: lead.closerId,
            leadId,
            kind: 'VARIABLE_CLOSER',
            amount: COMMISSION_CLOSER_CHF,
          },
        })
      }
      if (lead.sponsorId) {
        await tx.commissionEntry.create({
          data: {
            beneficiaryId: lead.sponsorId,
            leadId,
            kind: 'PARRAINAGE',
            amount: COMMISSION_PARRAINAGE_CHF,
          },
        })
      }
    }
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** CLOSER/ADMIN : marquer un signal traité. */
export async function treatSignal(signalId: string): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN', 'CLOSER'])
  if (!user) return { ok: false, error: 'forbidden' }

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: { lead: { select: { closerId: true } } },
  })
  if (!signal) return { ok: false, error: 'not-found' }
  if (
    user.role === 'CLOSER' &&
    signal.lead.closerId !== user.id &&
    signal.claimedById !== user.id
  ) {
    return { ok: false, error: 'forbidden' }
  }

  await prisma.signal.update({
    where: { id: signalId },
    data: { status: 'TRAITE', treatedAt: new Date() },
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** CLOSER : prendre un signal non assigné (claim). */
export async function claimSignal(signalId: string): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN', 'CLOSER'])
  if (!user) return { ok: false, error: 'forbidden' }

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: { lead: { select: { id: true, closerId: true } } },
  })
  if (!signal || signal.status !== 'OUVERT') return { ok: false, error: 'not-found' }
  if (signal.lead.closerId && signal.lead.closerId !== user.id) {
    return { ok: false, error: 'forbidden' } // déjà à un autre closer
  }

  await prisma.$transaction(async (tx) => {
    await tx.signal.update({ where: { id: signalId }, data: { claimedById: user.id } })
    // Prendre le signal, c'est prendre le lead.
    if (!signal.lead.closerId) {
      await tx.lead.update({ where: { id: signal.lead.id }, data: { closerId: user.id } })
    }
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** CLOSER/ADMIN : planifier un rappel (Appointment) depuis un signal ou une fiche. */
const scheduleSchema = z.object({
  leadId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  type: z.enum(['APPEL', 'VISIO']),
  notes: z.string().max(500).optional(),
})

export async function scheduleAppointment(
  input: z.infer<typeof scheduleSchema>
): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN', 'CLOSER'])
  if (!user) return { ok: false, error: 'forbidden' }
  const parsed = scheduleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }

  const lead = await prisma.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: { closerId: true },
  })
  if (!lead) return { ok: false, error: 'not-found' }
  if (user.role === 'CLOSER' && lead.closerId !== user.id) return { ok: false, error: 'forbidden' }

  await prisma.appointment.create({
    data: {
      leadId: parsed.data.leadId,
      closerId: user.role === 'CLOSER' ? user.id : (lead.closerId ?? user.id),
      date: new Date(parsed.data.date),
      type: parsed.data.type,
      notes: parsed.data.notes ?? null,
    },
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** CLOSER/ADMIN : notes internes de la fiche lead. */
export async function saveLeadNotes(leadId: string, notes: string): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN', 'CLOSER'])
  if (!user) return { ok: false, error: 'forbidden' }
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { closerId: true } })
  if (!lead) return { ok: false, error: 'not-found' }
  if (user.role === 'CLOSER' && lead.closerId !== user.id) return { ok: false, error: 'forbidden' }

  await prisma.lead.update({ where: { id: leadId }, data: { notes: notes.slice(0, 5000) } })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** ADMIN : CRUD des taux de référence (chaque changement alimente l'historique). */
const rateSchema = z.object({
  type: z.enum(['FIXE', 'SARON']),
  termYears: z.number().int().min(0).max(25),
  rate: z.number().min(0).max(15),
})

export async function upsertReferenceRate(
  input: z.infer<typeof rateSchema>
): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }
  const parsed = rateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const { type, termYears, rate } = parsed.data

  await prisma.$transaction([
    prisma.referenceRate.upsert({
      where: { type_termYears: { type: type as MortgageType, termYears } },
      create: { type: type as MortgageType, termYears, rate },
      update: { rate },
    }),
    prisma.referenceRateChange.create({
      data: { type: type as MortgageType, termYears, rate },
    }),
  ])
  revalidatePath('/admin/taux')
  return { ok: true }
}

export async function deleteReferenceRate(
  type: 'FIXE' | 'SARON',
  termYears: number
): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }
  await prisma.referenceRate.delete({
    where: { type_termYears: { type: type as MortgageType, termYears } },
  })
  revalidatePath('/admin/taux')
  return { ok: true }
}

/** ADMIN : marquer une commission payée. */
export async function markCommissionPaid(commissionId: string): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }
  await prisma.commissionEntry.update({
    where: { id: commissionId },
    data: { status: 'PAYEE', paidAt: new Date() },
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** ADMIN : changer le rôle d'un utilisateur. */
export async function changeUserRole(
  userId: string,
  role: 'CLIENT' | 'CLOSER' | 'PARTNER' | 'ADMIN'
): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }
  if (userId === user.id) return { ok: false, error: 'invalid' } // pas d'auto-rétrogradation
  await prisma.user.update({ where: { id: userId }, data: { role } })
  revalidatePath('/admin/utilisateurs')
  return { ok: true }
}

/** ADMIN : valider un compte partenaire (inscription publique). */
export async function approvePartner(userId: string): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }
  await prisma.user.update({
    where: { id: userId },
    data: { partnerApprovedAt: new Date() },
  })
  revalidatePath('/admin/partenaires')
  return { ok: true }
}

/** ADMIN : saisie manuelle des dépenses par canal/mois (CAC). */
const spendSchema = z.object({
  channel: z.string().min(1).max(60),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().min(0).max(10_000_000),
})

export async function saveChannelSpend(input: z.infer<typeof spendSchema>): Promise<ActionResult> {
  const user = await requireInternal(['ADMIN'])
  if (!user) return { ok: false, error: 'forbidden' }
  const parsed = spendSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const [y, m] = parsed.data.month.split('-')
  const month = new Date(Date.UTC(Number(y), Number(m) - 1, 1))

  await prisma.channelSpend.upsert({
    where: { channel_month: { channel: parsed.data.channel.toLowerCase(), month } },
    create: { channel: parsed.data.channel.toLowerCase(), month, amount: parsed.data.amount },
    update: { amount: parsed.data.amount },
  })
  revalidatePath('/admin/stats')
  return { ok: true }
}

/** PARTNER : « envoyer un client » — crée un lead taggé apporteur. */
const partnerLeadSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  context: z.string().max(500).optional(),
})

export async function submitPartnerLead(
  input: z.infer<typeof partnerLeadSchema>
): Promise<ActionResult> {
  const user = await requireInternal(['PARTNER'])
  if (!user) return { ok: false, error: 'forbidden' }
  const parsed = partnerLeadSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_CHAUD',
        status: 'NOUVEAU',
        score: 0,
        locale: 'fr',
        name: parsed.data.name,
        phone: parsed.data.phone,
        notes: parsed.data.context ?? null,
        partnerId: user.id,
        utmSource: 'partenaire',
        utmMedium: 'saisie-directe',
      },
    })
    await tx.leadStatusChange.create({
      data: { leadId: lead.id, fromStatus: null, toStatus: 'NOUVEAU' },
    })
    // Un client envoyé par un apporteur mérite un rappel rapide.
    await tx.signal.create({
      data: { leadId: lead.id, type: 'CALLBACK_DEMANDE', priority: 0 },
    })
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}
