import 'server-only'
import { getTranslations } from 'next-intl/server'
import { computeRenewalSavings } from '@/lib/finance'
import { formatCHF, formatRate } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { getReferenceRate10y } from '@/lib/rates'
import { BASE_URL } from '@/lib/seo'
import { routing, type Locale } from '@/i18n/routing'
import { alreadySent, lastSentAt, sendAndLog } from '@/server/email/provider'

// ─── Emails automatiques de nurturing ──────────────────────────────────
// Toujours DANS LA LANGUE DU LEAD. Templates sobres, un seul CTA par email.
// Idempotence via EmailLog (jamais deux fois le même template au même lead).

const DAY_MS = 86_400_000

function funnelUrl(locale: Locale, pathname: '/renouveler' | '/acheter' | '/connexion'): string {
  const slugs = routing.pathnames[pathname]
  return `${BASE_URL}/${locale}${slugs[locale]}`
}

export interface NurturingSummary {
  abandonJ1: number
  abandonJ3: number
  offersUnread: number
  quarterly: number
  rateUpdates: number
}

export async function runNurturing(now: Date = new Date()): Promise<NurturingSummary> {
  const summary: NurturingSummary = {
    abandonJ1: 0,
    abandonJ3: 0,
    offersUnread: 0,
    quarterly: 0,
    rateUpdates: 0,
  }
  const refRate = await getReferenceRate10y()

  // ── Abandon de brouillon : J+1 puis J+3
  const abandonedDrafts = await prisma.formDraft.findMany({
    where: {
      completedAt: null,
      email: { not: null },
      leadId: { not: null },
      updatedAt: { lt: new Date(now.getTime() - DAY_MS) },
    },
    include: { lead: { select: { id: true, name: true, locale: true, status: true } } },
  })

  for (const draft of abandonedDrafts) {
    const lead = draft.lead!
    if (lead.status !== 'NOUVEAU' && lead.status !== 'NURTURING') continue // déjà pris en main
    const locale = lead.locale as Locale
    const t = await getTranslations({ locale, namespace: 'emails' })
    const name = lead.name ?? ''
    const resumeUrl = funnelUrl(locale, draft.funnel === 'ACHAT' ? '/acheter' : '/renouveler')

    if (!(await alreadySent(lead.id, 'abandon-j1'))) {
      await sendAndLog({
        to: draft.email!,
        locale,
        template: 'abandon-j1',
        subject: t('abandonJ1.subject'),
        body: t('abandonJ1.body', { name }),
        ctaLabel: t('abandonJ1.cta'),
        ctaUrl: resumeUrl,
        leadId: lead.id,
      })
      summary.abandonJ1++
      continue // J+3 partira à une passe ultérieure
    }

    if (
      draft.updatedAt < new Date(now.getTime() - 3 * DAY_MS) &&
      !(await alreadySent(lead.id, 'abandon-j3'))
    ) {
      await sendAndLog({
        to: draft.email!,
        locale,
        template: 'abandon-j3',
        subject: t('abandonJ3.subject'),
        body: t('abandonJ3.body', { name }),
        ctaLabel: t('abandonJ3.cta'),
        ctaUrl: resumeUrl,
        leadId: lead.id,
      })
      summary.abandonJ3++
    }
  }

  // ── Offres non lues : J+2 après émission des offres
  const unreadLeads = await prisma.lead.findMany({
    where: {
      email: { not: null },
      status: { notIn: ['SIGNE', 'PERDU'] },
      offers: {
        some: { status: 'ACTIVE', createdAt: { lt: new Date(now.getTime() - 2 * DAY_MS) } },
      },
      events: { none: { type: 'OFFRE_OUVERTE' } },
    },
    select: { id: true, name: true, email: true, locale: true },
  })

  for (const lead of unreadLeads) {
    if (await alreadySent(lead.id, 'offres-non-lues')) continue
    const locale = lead.locale as Locale
    const t = await getTranslations({ locale, namespace: 'emails' })
    await sendAndLog({
      to: lead.email!,
      locale,
      template: 'offres-non-lues',
      subject: t('offersUnread.subject'),
      body: t('offersUnread.body', { name: lead.name ?? '' }),
      ctaLabel: t('offersUnread.cta'),
      ctaUrl: `${BASE_URL}/${locale}/app`,
      leadId: lead.id,
    })
    summary.offersUnread++
  }

  // ── Rappel trimestriel des surveillés froids : votre taux vs le marché
  const monitored = await prisma.lead.findMany({
    where: { status: 'NURTURING', email: { not: null }, mortgage: { isNot: null } },
    include: { mortgage: true },
  })

  for (const lead of monitored) {
    const last = (await lastSentAt(lead.id, 'trimestriel')) ?? lead.createdAt
    if (now.getTime() - last.getTime() < 90 * DAY_MS) continue

    const locale = lead.locale as Locale
    const t = await getTranslations({ locale, namespace: 'emails' })
    const savings = computeRenewalSavings({
      remainingAmount: Number(lead.mortgage!.remainingAmount),
      currentRate: Number(lead.mortgage!.currentRate),
      referenceRate: refRate,
    })
    await sendAndLog({
      to: lead.email!,
      locale,
      template: 'trimestriel',
      subject: t('quarterly.subject'),
      body: t('quarterly.body', {
        name: lead.name ?? '',
        rate: formatRate(Number(lead.mortgage!.currentRate)),
        refRate: formatRate(refRate),
        savings: formatCHF(Math.max(0, Math.round(savings))),
      }),
      ctaLabel: t('quarterly.cta'),
      ctaUrl: funnelUrl(locale, '/connexion'),
      leadId: lead.id,
    })
    summary.quarterly++
  }

  // ── Abonnés aux mises à jour de taux (widget home) : selon leur fréquence
  const FREQUENCY_MS: Record<string, number> = {
    QUOTIDIEN: 20 * 60 * 60 * 1000, // marge sur les 24h pour absorber l'heure du cron
    HEBDOMADAIRE: 6.5 * DAY_MS,
    MENSUEL: 28 * DAY_MS,
  }
  const subscriptions = await prisma.rateSubscription.findMany({
    where: { unsubscribedAt: null },
  })
  for (const sub of subscriptions) {
    const last = sub.lastSentAt ?? sub.createdAt
    if (now.getTime() - last.getTime() < FREQUENCY_MS[sub.frequency]!) continue

    const locale = sub.locale as Locale
    const t = await getTranslations({ locale, namespace: 'emails' })
    await sendAndLog({
      to: sub.email,
      locale,
      template: `zins-update-${sub.frequency.toLowerCase()}`,
      subject: t('rateUpdate.subject'),
      // Chaque email de taux embarque le lien de désinscription 1 clic.
      body: [
        t('rateUpdate.body', { refRate: formatRate(refRate) }),
        t('rateUpdate.unsubscribe', {
          url: `${BASE_URL}/api/alerts/unsubscribe/${sub.unsubscribeToken}`,
        }),
      ].join('\n\n'),
      ctaLabel: t('rateUpdate.cta'),
      ctaUrl: funnelUrl(locale, '/renouveler'),
    })
    await prisma.rateSubscription.update({
      where: { id: sub.id },
      data: { lastSentAt: now },
    })
    summary.rateUpdates++
  }

  return summary
}
