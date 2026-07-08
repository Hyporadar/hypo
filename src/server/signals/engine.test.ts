import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { evaluateSignals, signalPriority } from '@/server/signals/engine'

// Tests d'intégration sur la base locale. Toutes les données de test portent
// le domaine @test-signaux.local et sont nettoyées avant/après.

const DOMAIN = 'test-signaux.local'
const HOURS = 60 * 60 * 1000

function monthsFromNow(months: number): Date {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

async function cleanup() {
  const leads = await prisma.lead.findMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
    select: { id: true },
  })
  const ids = leads.map((l) => l.id)
  await prisma.formDraft.deleteMany({
    where: { OR: [{ leadId: { in: ids } }, { email: { endsWith: `@${DOMAIN}` } }] },
  })
  await prisma.dossier.deleteMany({ where: { leadId: { in: ids } } })
  await prisma.lead.deleteMany({ where: { id: { in: ids } } })
}

beforeAll(cleanup)
afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('moteur de signaux', () => {
  it('ENTREE_FENETRE : bascule un lead froid sous 18 mois en chaud, sans doublon', async () => {
    const lead = await prisma.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_FROID',
        status: 'NURTURING',
        locale: 'de',
        name: 'Test Fenster',
        email: `fenetre@${DOMAIN}`,
        mortgage: {
          create: {
            remainingAmount: 600_000,
            currentRate: 1.9,
            currentLender: 'Testbank',
            endDate: monthsFromNow(17), // vient de passer sous 18 mois
            type: 'FIXE',
            propertyValue: 1_000_000,
          },
        },
      },
    })

    const first = await evaluateSignals()
    expect(first.basculesFroidChaud).toBeGreaterThanOrEqual(1)

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })
    expect(updated.funnel).toBe('RENOUVELLEMENT_CHAUD')
    expect(updated.status).toBe('NOUVEAU') // réveillé : sort du nurturing

    const transition = await prisma.leadStatusChange.findFirst({
      where: { leadId: lead.id, fromStatus: 'NURTURING', toStatus: 'NOUVEAU' },
    })
    expect(transition).not.toBeNull()

    const signals = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'ENTREE_FENETRE' },
    })
    expect(signals).toHaveLength(1)
    expect(signals[0]!.priority).toBe(signalPriority('ENTREE_FENETRE', 600_000))

    // Seconde passe : idempotente, aucun doublon ouvert.
    await evaluateSignals()
    const after = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'ENTREE_FENETRE' },
    })
    expect(after).toHaveLength(1)
  })

  it('ABANDON_DOSSIER : matérialise le brouillon abandonné en lead + signal', async () => {
    const draftId = crypto.randomUUID()
    await prisma.formDraft.create({
      data: {
        id: draftId,
        funnel: 'RENOUVELLEMENT_CHAUD',
        locale: 'it',
        step: 4, // > 50% des 5 questions
        email: `abbandono@${DOMAIN}`,
        data: { amount: 450_000, name: 'Test Abbandono' },
        updatedAt: new Date(Date.now() - 25 * HOURS),
      },
    })

    await evaluateSignals()

    const lead = await prisma.lead.findFirst({
      where: { email: `abbandono@${DOMAIN}` },
      include: { signals: true, formDrafts: true },
    })
    expect(lead).not.toBeNull()
    expect(lead!.locale).toBe('it')
    expect(lead!.name).toBe('Test Abbandono')
    expect(lead!.signals.filter((s) => s.type === 'ABANDON_DOSSIER')).toHaveLength(1)
    expect(lead!.formDrafts[0]?.id).toBe(draftId)

    // Pas de doublon à la passe suivante.
    await evaluateSignals()
    const again = await prisma.signal.findMany({
      where: { leadId: lead!.id, type: 'ABANDON_DOSSIER' },
    })
    expect(again).toHaveLength(1)
  })

  it('ABANDON_DOSSIER : ignore les brouillons < 50% ou sans email', async () => {
    await prisma.formDraft.create({
      data: {
        id: crypto.randomUUID(),
        funnel: 'RENOUVELLEMENT_CHAUD',
        locale: 'fr',
        step: 1, // pas assez avancé
        email: `trop-tot@${DOMAIN}`,
        data: { amount: 300_000 },
        updatedAt: new Date(Date.now() - 48 * HOURS),
      },
    })

    await evaluateSignals()
    const lead = await prisma.lead.findFirst({ where: { email: `trop-tot@${DOMAIN}` } })
    expect(lead).toBeNull()
  })

  it('ABANDON_DOSSIER (wizard) : dossier >50% inactif 24h → signal + événement, sans doublon', async () => {
    const lead = await prisma.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_CHAUD',
        status: 'NOUVEAU',
        locale: 'fr',
        name: 'Test Dossier Abandonné',
        email: `dossier-abandon@${DOMAIN}`,
      },
    })
    const dossier = await prisma.dossier.create({
      data: {
        id: crypto.randomUUID(),
        funnel: 'RENOUVELLEMENT_CHAUD',
        locale: 'fr',
        leadId: lead.id,
        completude: 60,
        lastActivityAt: new Date(Date.now() - 25 * HOURS),
        tranchesExistantes: {
          create: { ordre: 1, montant: 400_000, produit: 'FIXE' },
        },
      },
    })

    await evaluateSignals()

    const signals = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'ABANDON_DOSSIER' },
    })
    expect(signals).toHaveLength(1)
    expect(signals[0]!.priority).toBe(signalPriority('ABANDON_DOSSIER', 400_000))

    const events = await prisma.dossierEvent.findMany({
      where: { dossierId: dossier.id, type: 'WIZARD_ABANDONED' },
    })
    expect(events).toHaveLength(1)

    // Seconde passe : idempotente, ni doublon de signal ni d'événement.
    await evaluateSignals()
    expect(
      await prisma.signal.count({ where: { leadId: lead.id, type: 'ABANDON_DOSSIER' } })
    ).toBe(1)
    expect(
      await prisma.dossierEvent.count({
        where: { dossierId: dossier.id, type: 'WIZARD_ABANDONED' },
      })
    ).toBe(1)
  })

  it('ABANDON_DOSSIER (wizard) : ignore les dossiers ≤50% ou actifs récemment', async () => {
    const leadPeuComplet = await prisma.lead.create({
      data: {
        funnel: 'ACHAT',
        status: 'NOUVEAU',
        locale: 'fr',
        email: `dossier-peu-complet@${DOMAIN}`,
      },
    })
    await prisma.dossier.create({
      data: {
        id: crypto.randomUUID(),
        funnel: 'ACHAT',
        locale: 'fr',
        leadId: leadPeuComplet.id,
        completude: 40, // pas assez avancé
        lastActivityAt: new Date(Date.now() - 48 * HOURS),
      },
    })

    const leadActif = await prisma.lead.create({
      data: {
        funnel: 'ACHAT',
        status: 'NOUVEAU',
        locale: 'fr',
        email: `dossier-actif@${DOMAIN}`,
      },
    })
    await prisma.dossier.create({
      data: {
        id: crypto.randomUUID(),
        funnel: 'ACHAT',
        locale: 'fr',
        leadId: leadActif.id,
        completude: 80,
        lastActivityAt: new Date(), // encore actif
      },
    })

    await evaluateSignals()

    expect(
      await prisma.signal.count({
        where: { leadId: { in: [leadPeuComplet.id, leadActif.id] }, type: 'ABANDON_DOSSIER' },
      })
    ).toBe(0)
  })

  it('OFFRES_NON_LUES : offres actives depuis 48h sans ouverture', async () => {
    const lead = await prisma.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_CHAUD',
        status: 'OFFRES_RECUES',
        locale: 'fr',
        name: 'Test Offres',
        email: `offres@${DOMAIN}`,
        mortgage: {
          create: {
            remainingAmount: 500_000,
            currentRate: 2.0,
            currentLender: 'Testbank',
            endDate: monthsFromNow(10),
            type: 'FIXE',
            propertyValue: 800_000,
          },
        },
        offers: {
          create: {
            lender: 'Banque A',
            rate: 1.3,
            termYears: 10,
            validUntil: monthsFromNow(1),
            createdAt: new Date(Date.now() - 72 * HOURS),
          },
        },
      },
    })

    await evaluateSignals()
    const signals = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'OFFRES_NON_LUES' },
    })
    expect(signals).toHaveLength(1)
  })

  it('OFFRES_NON_LUES : pas de signal si le client a ouvert ses offres', async () => {
    const lead = await prisma.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_CHAUD',
        status: 'OFFRES_RECUES',
        locale: 'fr',
        name: 'Test Lu',
        email: `offres-lues@${DOMAIN}`,
        offers: {
          create: {
            lender: 'Banque B',
            rate: 1.4,
            termYears: 10,
            validUntil: monthsFromNow(1),
            createdAt: new Date(Date.now() - 72 * HOURS),
          },
        },
      },
    })
    await prisma.clientEvent.create({
      data: { type: 'OFFRE_OUVERTE', leadId: lead.id },
    })

    await evaluateSignals()
    const signals = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'OFFRES_NON_LUES' },
    })
    expect(signals).toHaveLength(0)
  })

  it('OFFRE_EXPIRE_BIENTOT : meilleure offre à moins de 7 jours', async () => {
    const lead = await prisma.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_CHAUD',
        status: 'OFFRES_RECUES',
        locale: 'de',
        name: 'Test Ablauf',
        email: `expire@${DOMAIN}`,
        offers: {
          create: {
            lender: 'Bank C',
            rate: 1.25,
            termYears: 10,
            validUntil: new Date(Date.now() + 3 * 24 * HOURS),
          },
        },
      },
    })

    await evaluateSignals()
    const signal = await prisma.signal.findFirst({
      where: { leadId: lead.id, type: 'OFFRE_EXPIRE_BIENTOT' },
    })
    expect(signal).not.toBeNull()
    expect((signal!.context as { daysLeft: number }).daysLeft).toBeLessThanOrEqual(7)
  })

  it('GROSSE_ECONOMIE : économie > 2000 CHF/an sans suite depuis 24h, one-shot', async () => {
    const lead = await prisma.lead.create({
      data: {
        funnel: 'RENOUVELLEMENT_CHAUD',
        status: 'NOUVEAU',
        locale: 'fr',
        name: 'Test Économie',
        email: `economie@${DOMAIN}`,
        createdAt: new Date(Date.now() - 30 * HOURS),
        mortgage: {
          create: {
            remainingAmount: 500_000,
            currentRate: 2.5, // vs référence 1,75 → 3'750/an
            currentLender: 'Testbank',
            endDate: monthsFromNow(12),
            type: 'FIXE',
            propertyValue: 900_000,
          },
        },
      },
    })

    await evaluateSignals()
    const signals = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'GROSSE_ECONOMIE' },
    })
    expect(signals).toHaveLength(1)
    expect((signals[0]!.context as { savings: number }).savings).toBeGreaterThan(2_000)

    // Traité puis réévalué : one-shot, pas de re-création.
    await prisma.signal.update({
      where: { id: signals[0]!.id },
      data: { status: 'TRAITE', treatedAt: new Date() },
    })
    await evaluateSignals()
    const after = await prisma.signal.findMany({
      where: { leadId: lead.id, type: 'GROSSE_ECONOMIE' },
    })
    expect(after).toHaveLength(1)
  })

  it('les CALLBACK ont la plus haute urgence', () => {
    expect(signalPriority('CALLBACK_DEMANDE', 100_000)).toBeGreaterThan(
      signalPriority('OFFRE_EXPIRE_BIENTOT', 100_000)
    )
    expect(signalPriority('OFFRE_EXPIRE_BIENTOT', 100_000)).toBeGreaterThan(
      signalPriority('GROSSE_ECONOMIE', 100_000)
    )
  })
})
