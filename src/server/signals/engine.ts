import 'server-only'
import type { Prisma, SignalType } from '@prisma/client'
import {
  computeRenewalSavings,
  monthsUntil,
  SEUIL_CHAUD_MOIS,
  SEUIL_GROSSE_ECONOMIE,
} from '@/lib/finance'
import { prisma } from '@/lib/prisma'
import { getReferenceRate10y } from '@/lib/rates'
import { notificationProvider } from '@/server/notifications'

// ─── Moteur de signaux ─────────────────────────────────────────────────
// Transforme les comportements en appels au bon moment. Évalué par le cron
// (/api/cron/signals) ; toutes les règles sont idempotentes : jamais de
// doublon OUVERT du même type pour le même lead.

/** Urgence par type — la priorité d'un signal = montant × urgence / 1000. */
export const SIGNAL_URGENCE: Record<SignalType, number> = {
  CALLBACK_DEMANDE: 10, // temps réel, toujours en tête de file
  OFFRE_EXPIRE_BIENTOT: 5,
  ABANDON_DOSSIER: 4,
  ENTREE_FENETRE: 3,
  OFFRES_NON_LUES: 3,
  GROSSE_ECONOMIE: 2,
}

export function signalPriority(type: SignalType, amount: number): number {
  return Math.round((Math.max(0, amount) * SIGNAL_URGENCE[type]) / 1000)
}

const ABANDON_INACTIVITY_MS = 24 * 60 * 60 * 1000
const OFFERS_UNREAD_MS = 48 * 60 * 60 * 1000
const OFFER_EXPIRY_DAYS = 7
// « > 50% complété » : achat = 2 questions sur 3, renouvellement = 3 sur 5.
const ABANDON_MIN_STEP: Record<string, number> = {
  ACHAT: 2,
  RENOUVELLEMENT_CHAUD: 3,
  RENOUVELLEMENT_FROID: 3,
}

export interface EngineSummary {
  abandons: number
  offresNonLues: number
  offresExpirent: number
  entreesFenetre: number
  basculesFroidChaud: number
  grossesEconomies: number
}

/**
 * Crée un signal s'il n'existe pas déjà un signal OUVERT du même type pour
 * ce lead. Notifie le closer assigné à la création. Retourne true si créé.
 */
export async function createSignalIfAbsent(
  leadId: string,
  type: SignalType,
  amount: number,
  context?: Prisma.InputJsonValue
): Promise<boolean> {
  const existing = await prisma.signal.findFirst({
    where: { leadId, type, status: 'OUVERT' },
    select: { id: true },
  })
  if (existing) return false

  const signal = await prisma.signal.create({
    data: { leadId, type, priority: signalPriority(type, amount), context },
  })

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { name: true, closer: { select: { name: true, email: true } } },
  })
  if (lead?.closer) {
    await notificationProvider.notifyCloser({
      closerEmail: lead.closer.email,
      closerName: lead.closer.name,
      signal: { id: signal.id, type, priority: signal.priority },
      leadName: lead.name,
    })
  }
  return true
}

/** Règle 1 — ABANDON_DOSSIER : brouillon >50% complété, inactif 24h, email connu. */
async function evaluateAbandons(now: Date): Promise<number> {
  const stale = await prisma.formDraft.findMany({
    where: {
      completedAt: null,
      email: { not: null },
      updatedAt: { lt: new Date(now.getTime() - ABANDON_INACTIVITY_MS) },
    },
  })

  let created = 0
  for (const draft of stale) {
    if (draft.step < (ABANDON_MIN_STEP[draft.funnel] ?? 3)) continue

    // Le brouillon abandonné avec email EST un lead : on le matérialise.
    let leadId = draft.leadId
    if (!leadId) {
      const data = draft.data as Record<string, unknown>
      const amount = Number(data.amount ?? data.price ?? 0) || 0
      const lead = await prisma.lead.create({
        data: {
          funnel: draft.funnel,
          status: 'NOUVEAU',
          score: 0,
          locale: draft.locale,
          name: typeof data.name === 'string' && data.name ? data.name : null,
          email: draft.email,
          phone: typeof data.phone === 'string' && data.phone ? data.phone : null,
          utmContent: 'abandon-brouillon',
          statusHistory: { create: { fromStatus: null, toStatus: 'NOUVEAU' } },
        },
      })
      await prisma.formDraft.update({ where: { id: draft.id }, data: { leadId: lead.id } })
      leadId = lead.id
      void amount
    }

    const data = draft.data as Record<string, unknown>
    const amount = Number(data.amount ?? data.price ?? 0) || 0
    if (await createSignalIfAbsent(leadId, 'ABANDON_DOSSIER', amount, { draftId: draft.id })) {
      created++
    }
  }
  return created
}

/** Règle 2 — OFFRES_NON_LUES : offres actives, aucune ouverture depuis 48h. */
async function evaluateUnreadOffers(now: Date): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: {
      status: { notIn: ['SIGNE', 'PERDU'] },
      offers: { some: { status: 'ACTIVE' } },
    },
    include: {
      offers: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
      mortgage: { select: { remainingAmount: true } },
      events: {
        where: { type: 'OFFRE_OUVERTE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  let created = 0
  for (const lead of leads) {
    const newestOffer = lead.offers[0]!
    if (now.getTime() - newestOffer.createdAt.getTime() < OFFERS_UNREAD_MS) continue
    const lastOpened = lead.events[0]?.createdAt
    if (lastOpened && lastOpened > newestOffer.createdAt) continue

    const amount = Number(lead.mortgage?.remainingAmount ?? 0)
    if (await createSignalIfAbsent(lead.id, 'OFFRES_NON_LUES', amount)) created++
  }
  return created
}

/** Règle 3 — OFFRE_EXPIRE_BIENTOT : meilleure offre expire dans ≤ 7 jours. */
async function evaluateExpiringOffers(now: Date): Promise<number> {
  const horizon = new Date(now.getTime() + OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  const leads = await prisma.lead.findMany({
    where: {
      status: { notIn: ['SIGNE', 'PERDU'] },
      offers: { some: { status: 'ACTIVE', validUntil: { gte: now, lte: horizon } } },
    },
    include: {
      offers: { where: { status: 'ACTIVE' }, orderBy: { rate: 'asc' }, take: 1 },
      mortgage: { select: { remainingAmount: true } },
    },
  })

  let created = 0
  for (const lead of leads) {
    const best = lead.offers[0]!
    if (best.validUntil < now || best.validUntil > horizon) continue
    const amount = Number(lead.mortgage?.remainingAmount ?? 0)
    const daysLeft = Math.ceil((best.validUntil.getTime() - now.getTime()) / 86_400_000)
    if (
      await createSignalIfAbsent(lead.id, 'OFFRE_EXPIRE_BIENTOT', amount, {
        offerId: best.id,
        daysLeft,
      })
    ) {
      created++
    }
  }
  return created
}

/**
 * Règle 4 — ENTREE_FENETRE : hypothèque surveillée qui passe sous 18 mois.
 * Crée le signal ET bascule le lead RENOUVELLEMENT_FROID → CHAUD.
 * Renforcement à J-30 du préavis estimé (échéance − 5 mois).
 */
async function evaluateWindowEntries(now: Date): Promise<{ signals: number; switches: number }> {
  const mortgages = await prisma.mortgage.findMany({
    where: { leadId: { not: null }, lead: { status: { notIn: ['SIGNE', 'PERDU'] } } },
    include: { lead: true },
  })

  let signals = 0
  let switches = 0
  for (const mortgage of mortgages) {
    const lead = mortgage.lead!
    const months = monthsUntil(mortgage.endDate, now)

    // Entrée en fenêtre : < 18 mois et encore marqué froid.
    if (months < SEUIL_CHAUD_MOIS && lead.funnel === 'RENOUVELLEMENT_FROID') {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            funnel: 'RENOUVELLEMENT_CHAUD',
            status: lead.status === 'NURTURING' ? 'NOUVEAU' : lead.status,
          },
        })
        if (lead.status === 'NURTURING') {
          await tx.leadStatusChange.create({
            data: { leadId: lead.id, fromStatus: 'NURTURING', toStatus: 'NOUVEAU' },
          })
        }
      })
      switches++
      if (
        await createSignalIfAbsent(lead.id, 'ENTREE_FENETRE', Number(mortgage.remainingAmount), {
          monthsUntilEnd: months,
        })
      ) {
        signals++
      }
      continue
    }

    // Renforcement : J-30 du préavis estimé (échéance − 5 mois), lead chaud.
    if (lead.funnel === 'RENOUVELLEMENT_CHAUD') {
      const noticeEstimate = new Date(mortgage.endDate)
      noticeEstimate.setUTCMonth(noticeEstimate.getUTCMonth() - 5)
      const reinforceFrom = new Date(noticeEstimate.getTime() - 30 * 86_400_000)
      if (now >= reinforceFrom && now < noticeEstimate) {
        const alreadyReinforced = await prisma.signal.findFirst({
          where: { leadId: lead.id, type: 'ENTREE_FENETRE', createdAt: { gte: reinforceFrom } },
          select: { id: true },
        })
        if (!alreadyReinforced) {
          if (
            await createSignalIfAbsent(
              lead.id,
              'ENTREE_FENETRE',
              Number(mortgage.remainingAmount),
              { reinforced: true, noticeDeadline: noticeEstimate.toISOString() }
            )
          ) {
            signals++
          }
        }
      }
    }
  }
  return { signals, switches }
}

/** Règle 5 — GROSSE_ECONOMIE : économie > CHF 2'000/an restée sans suite 24h. */
async function evaluateBigSavings(now: Date): Promise<number> {
  const refRate = await getReferenceRate10y()
  const leads = await prisma.lead.findMany({
    where: {
      funnel: { in: ['RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID'] },
      status: { in: ['NOUVEAU', 'NURTURING'] },
      createdAt: { lt: new Date(now.getTime() - ABANDON_INACTIVITY_MS) },
      mortgage: { isNot: null },
    },
    include: { mortgage: true },
  })

  let created = 0
  for (const lead of leads) {
    const savings = computeRenewalSavings({
      remainingAmount: Number(lead.mortgage!.remainingAmount),
      currentRate: Number(lead.mortgage!.currentRate),
      referenceRate: refRate,
    })
    if (savings <= SEUIL_GROSSE_ECONOMIE) continue

    // One-shot : un signal GROSSE_ECONOMIE déjà émis (même traité) suffit.
    const everCreated = await prisma.signal.findFirst({
      where: { leadId: lead.id, type: 'GROSSE_ECONOMIE' },
      select: { id: true },
    })
    if (everCreated) continue

    if (
      await createSignalIfAbsent(
        lead.id,
        'GROSSE_ECONOMIE',
        Number(lead.mortgage!.remainingAmount),
        {
          savings: Math.round(savings),
        }
      )
    ) {
      created++
    }
  }
  return created
}

/** Passe complète — idempotente, appelée par le cron. */
export async function evaluateSignals(now: Date = new Date()): Promise<EngineSummary> {
  const abandons = await evaluateAbandons(now)
  const offresNonLues = await evaluateUnreadOffers(now)
  const offresExpirent = await evaluateExpiringOffers(now)
  const fenetre = await evaluateWindowEntries(now)
  const grossesEconomies = await evaluateBigSavings(now)

  return {
    abandons,
    offresNonLues,
    offresExpirent,
    entreesFenetre: fenetre.signals,
    basculesFroidChaud: fenetre.switches,
    grossesEconomies,
  }
}
