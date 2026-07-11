// Seed de développement — données réalistes, déterministes.
// Mot de passe de tous les comptes : « Password123! »
//   admin@hypopilot.ch, closer1/2@hypopilot.ch, partner1/2@hypopilot.ch,
//   client1..10@exemple.ch
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient, type Funnel, type LeadStatus, type Locale } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { renewalFunnel } from '../src/lib/finance'
import { saveDossierVersion } from '../src/server/dossier/versioning'
import type { DossierData } from '../src/lib/dossier/schema'

const prisma = new PrismaClient()

const NOW = new Date()

function monthsFromNow(months: number): Date {
  const d = new Date(NOW)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

// Pipeline ordonné pour reconstituer un historique de statuts plausible.
const PIPELINE: LeadStatus[] = [
  'NOUVEAU',
  'CONTACTE',
  'RDV',
  'DOSSIER_EN_COURS',
  'DOSSIER_COMPLET',
  'ENVOYE_PARTENAIRE',
  'OFFRES_RECUES',
  'SIGNE',
]

async function main() {
  console.log('Seed HypoPilot…')

  // ─── Nettoyage (ordre : enfants → parents) ──────────────────────────
  await prisma.dossierEvent.deleteMany()
  await prisma.dossierVersion.deleteMany()
  await prisma.dossier.deleteMany()
  await prisma.lender.deleteMany()
  await prisma.swissLocality.deleteMany()
  await prisma.magicLinkToken.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.commissionEntry.deleteMany()
  await prisma.document.deleteMany()
  await prisma.offer.deleteMany()
  await prisma.signal.deleteMany()
  await prisma.leadStatusChange.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.purchaseProject.deleteMany()
  await prisma.mortgage.deleteMany()
  await prisma.referenceRate.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('Password123!', 12)

  // ─── Utilisateurs ────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@hypopilot.ch',
      passwordHash,
      name: 'Alice Berthoud',
      phone: '+41 21 555 00 01',
      role: 'ADMIN',
      locale: 'fr',
    },
  })

  const [closer1, closer2] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'closer1@hypopilot.ch',
        passwordHash,
        name: 'Marc Dubois',
        phone: '+41 21 555 00 02',
        role: 'CLOSER',
        locale: 'fr',
      },
    }),
    prisma.user.create({
      data: {
        email: 'closer2@hypopilot.ch',
        passwordHash,
        name: 'Sandra Keller',
        phone: '+41 44 555 00 03',
        role: 'CLOSER',
        locale: 'de',
      },
    }),
  ])

  const [partner1, partner2] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'partner1@hypopilot.ch',
        passwordHash,
        name: 'Régie Lambert SA',
        phone: '+41 22 555 00 04',
        role: 'PARTNER',
        partnerCode: 'LAMBERT',
        locale: 'fr',
      },
    }),
    prisma.user.create({
      data: {
        email: 'partner2@hypopilot.ch',
        passwordHash,
        name: 'Fiduciaria Bernasconi',
        phone: '+41 91 555 00 05',
        role: 'PARTNER',
        partnerCode: 'BERNASCONI',
        locale: 'it',
      },
    }),
  ])

  const clientSpecs: Array<{ name: string; locale: Locale; phone: string }> = [
    { name: 'Jean Rochat', locale: 'fr', phone: '+41 79 555 10 01' },
    { name: 'Marie Favre', locale: 'fr', phone: '+41 79 555 10 02' },
    { name: 'Luc Perrin', locale: 'fr', phone: '+41 78 555 10 03' },
    { name: 'Sophie Maillard', locale: 'fr', phone: '+41 76 555 10 04' },
    { name: 'Nicolas Chevalley', locale: 'fr', phone: '+41 79 555 10 05' },
    { name: 'Thomas Brunner', locale: 'de', phone: '+41 79 555 10 06' },
    { name: 'Anna Meier', locale: 'de', phone: '+41 78 555 10 07' },
    { name: 'Stefan Huber', locale: 'de', phone: '+41 76 555 10 08' },
    { name: 'Giulia Ferrari', locale: 'it', phone: '+41 79 555 10 09' },
    { name: 'Marco Rossi', locale: 'it', phone: '+41 78 555 10 10' },
  ]

  const clients = []
  for (const [i, spec] of clientSpecs.entries()) {
    clients.push(
      await prisma.user.create({
        data: {
          email: `client${i + 1}@exemple.ch`,
          passwordHash,
          name: spec.name,
          phone: spec.phone,
          role: 'CLIENT',
          locale: spec.locale,
        },
      })
    )
  }

  // ─── Taux de référence nationaux ─────────────────────────────────────
  // SARON : termYears = 0.
  const rates: Array<{ termYears: number; rate: number; type: 'FIXE' | 'SARON' }> = [
    { type: 'SARON', termYears: 0, rate: 0.9 },
    { type: 'FIXE', termYears: 2, rate: 1.1 },
    { type: 'FIXE', termYears: 3, rate: 1.15 },
    { type: 'FIXE', termYears: 4, rate: 1.22 },
    { type: 'FIXE', termYears: 5, rate: 1.3 },
    { type: 'FIXE', termYears: 6, rate: 1.38 },
    { type: 'FIXE', termYears: 7, rate: 1.45 },
    { type: 'FIXE', termYears: 8, rate: 1.55 },
    { type: 'FIXE', termYears: 9, rate: 1.65 },
    { type: 'FIXE', termYears: 10, rate: 1.75 },
  ]
  for (const r of rates) {
    await prisma.referenceRate.create({ data: r })
  }

  // ─── Hypothèques (clients renouvellement) & projets d'achat ──────────
  const lenders = ['UBS', 'Raiffeisen', 'Banque Cantonale Vaudoise', 'ZKB', 'PostFinance']
  const mortgageSpecs = [
    { client: 0, remaining: 650_000, rate: 1.85, endMonths: 9, value: 1_050_000 }, // chaud
    { client: 1, remaining: 480_000, rate: 2.1, endMonths: 14, value: 820_000 }, // chaud, grosse économie
    { client: 3, remaining: 720_000, rate: 1.65, endMonths: 16, value: 1_200_000 }, // chaud
    { client: 5, remaining: 550_000, rate: 1.4, endMonths: 26, value: 900_000 }, // froid
    { client: 6, remaining: 830_000, rate: 1.95, endMonths: 3, value: 1_300_000 }, // trop tard
    { client: 8, remaining: 400_000, rate: 1.55, endMonths: 36, value: 700_000 }, // froid
  ] as const
  const mortgages = []
  for (const [i, m] of mortgageSpecs.entries()) {
    mortgages.push(
      await prisma.mortgage.create({
        data: {
          userId: clients[m.client]!.id,
          remainingAmount: m.remaining,
          currentRate: m.rate,
          currentLender: lenders[i % lenders.length]!,
          endDate: monthsFromNow(m.endMonths),
          type: i % 3 === 2 ? 'SARON' : 'FIXE',
          propertyValue: m.value,
        },
      })
    )
  }

  const projectSpecs = [
    { client: 2, price: 850_000, ownFunds: 180_000, pillar2: 60_000, income: 165_000 },
    { client: 4, price: 1_000_000, ownFunds: 200_000, pillar2: 0, income: 180_000 }, // cas du brief
    { client: 7, price: 1_250_000, ownFunds: 320_000, pillar2: 100_000, income: 240_000 },
    { client: 9, price: 620_000, ownFunds: 130_000, pillar2: 40_000, income: 120_000 },
  ] as const
  for (const p of projectSpecs) {
    await prisma.purchaseProject.create({
      data: {
        userId: clients[p.client]!.id,
        price: p.price,
        ownFunds: p.ownFunds,
        ownFundsPillar2: p.pillar2,
        annualGrossIncome: p.income,
      },
    })
  }

  // ─── Leads ───────────────────────────────────────────────────────────
  const UTM = [
    {
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'capacite-achat-fr',
      utmTerm: 'hypotheque calcul',
      utmContent: 'annonce-a',
    },
    {
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'renouvellement-fr',
      utmTerm: 'renouveler hypotheque',
      utmContent: 'annonce-b',
    },
    {
      utmSource: 'facebook',
      utmMedium: 'paid-social',
      utmCampaign: 'proprietaires-40-60',
      utmTerm: null,
      utmContent: 'video-timeline',
    },
    {
      utmSource: 'newsletter',
      utmMedium: 'email',
      utmCampaign: 'alerte-taux-q3',
      utmTerm: null,
      utmContent: null,
    },
    {
      utmSource: 'partenaire',
      utmMedium: 'referral',
      utmCampaign: 'apporteurs',
      utmTerm: null,
      utmContent: null,
    },
    { utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null }, // organique
  ]

  type LeadSpec = {
    funnel: Funnel | 'AUTO' // AUTO = routé par renewalFunnel() sur l'échéance
    status: LeadStatus
    client: number
    closer?: 1 | 2
    partner?: 1 | 2
    utm: number
    createdDaysAgo: number
    // minutes entre NOUVEAU et CONTACTE (speed-to-lead) ; défaut 5 min
    contactMinutes?: number
    mortgageMonths?: number // pour funnel AUTO
  }

  const specs: LeadSpec[] = [
    // ── ACHAT (10)
    { funnel: 'ACHAT', status: 'NOUVEAU', client: 2, utm: 0, createdDaysAgo: 0 },
    { funnel: 'ACHAT', status: 'NOUVEAU', client: 4, utm: 2, createdDaysAgo: 1 },
    {
      funnel: 'ACHAT',
      status: 'CONTACTE',
      client: 7,
      closer: 2,
      utm: 0,
      createdDaysAgo: 2,
      contactMinutes: 4,
    },
    {
      funnel: 'ACHAT',
      status: 'CONTACTE',
      client: 9,
      closer: 1,
      utm: 5,
      createdDaysAgo: 3,
      contactMinutes: 7,
    },
    {
      funnel: 'ACHAT',
      status: 'RDV',
      client: 2,
      closer: 1,
      utm: 1,
      createdDaysAgo: 6,
      contactMinutes: 3,
    },
    {
      funnel: 'ACHAT',
      status: 'DOSSIER_EN_COURS',
      client: 4,
      closer: 2,
      utm: 3,
      createdDaysAgo: 12,
      contactMinutes: 5,
    },
    {
      funnel: 'ACHAT',
      status: 'DOSSIER_COMPLET',
      client: 7,
      closer: 2,
      utm: 0,
      createdDaysAgo: 20,
      contactMinutes: 6,
    },
    {
      funnel: 'ACHAT',
      status: 'ENVOYE_PARTENAIRE',
      client: 9,
      closer: 1,
      partner: 2,
      utm: 4,
      createdDaysAgo: 30,
      contactMinutes: 4,
    },
    {
      funnel: 'ACHAT',
      status: 'SIGNE',
      client: 2,
      closer: 1,
      partner: 1,
      utm: 4,
      createdDaysAgo: 60,
      contactMinutes: 5,
    },
    {
      funnel: 'ACHAT',
      status: 'PERDU',
      client: 4,
      closer: 2,
      utm: 2,
      createdDaysAgo: 45,
      contactMinutes: 90,
    },
    // ── RENOUVELLEMENT CHAUD (12)
    { funnel: 'AUTO', status: 'NOUVEAU', client: 0, utm: 1, createdDaysAgo: 0, mortgageMonths: 9 },
    { funnel: 'AUTO', status: 'NOUVEAU', client: 1, utm: 3, createdDaysAgo: 0, mortgageMonths: 14 },
    { funnel: 'AUTO', status: 'NOUVEAU', client: 3, utm: 5, createdDaysAgo: 1, mortgageMonths: 16 },
    {
      funnel: 'AUTO',
      status: 'CONTACTE',
      client: 0,
      closer: 1,
      utm: 1,
      createdDaysAgo: 3,
      contactMinutes: 4,
      mortgageMonths: 9,
    },
    {
      funnel: 'AUTO',
      status: 'CONTACTE',
      client: 1,
      closer: 2,
      utm: 2,
      createdDaysAgo: 4,
      contactMinutes: 12,
      mortgageMonths: 14,
    },
    {
      funnel: 'AUTO',
      status: 'RDV',
      client: 3,
      closer: 1,
      utm: 1,
      createdDaysAgo: 8,
      contactMinutes: 5,
      mortgageMonths: 16,
    },
    {
      funnel: 'AUTO',
      status: 'RDV',
      client: 0,
      closer: 2,
      utm: 5,
      createdDaysAgo: 10,
      contactMinutes: 3,
      mortgageMonths: 9,
    },
    {
      funnel: 'AUTO',
      status: 'DOSSIER_EN_COURS',
      client: 1,
      closer: 1,
      utm: 3,
      createdDaysAgo: 15,
      contactMinutes: 6,
      mortgageMonths: 14,
    },
    {
      funnel: 'AUTO',
      status: 'DOSSIER_COMPLET',
      client: 3,
      closer: 2,
      partner: 1,
      utm: 4,
      createdDaysAgo: 25,
      contactMinutes: 5,
      mortgageMonths: 16,
    },
    {
      funnel: 'AUTO',
      status: 'OFFRES_RECUES',
      client: 0,
      closer: 1,
      utm: 1,
      createdDaysAgo: 35,
      contactMinutes: 4,
      mortgageMonths: 9,
    },
    {
      funnel: 'AUTO',
      status: 'OFFRES_RECUES',
      client: 1,
      closer: 2,
      utm: 0,
      createdDaysAgo: 40,
      contactMinutes: 8,
      mortgageMonths: 14,
    },
    {
      funnel: 'AUTO',
      status: 'SIGNE',
      client: 3,
      closer: 1,
      partner: 1,
      utm: 4,
      createdDaysAgo: 90,
      contactMinutes: 5,
      mortgageMonths: 16,
    },
    // ── RENOUVELLEMENT FROID (8) — surveillance
    {
      funnel: 'AUTO',
      status: 'NURTURING',
      client: 5,
      utm: 2,
      createdDaysAgo: 5,
      mortgageMonths: 26,
    },
    {
      funnel: 'AUTO',
      status: 'NURTURING',
      client: 8,
      utm: 3,
      createdDaysAgo: 10,
      mortgageMonths: 36,
    },
    {
      funnel: 'AUTO',
      status: 'NURTURING',
      client: 5,
      utm: 5,
      createdDaysAgo: 30,
      mortgageMonths: 26,
    },
    {
      funnel: 'AUTO',
      status: 'NURTURING',
      client: 8,
      utm: 0,
      createdDaysAgo: 50,
      mortgageMonths: 36,
    },
    {
      funnel: 'AUTO',
      status: 'NURTURING',
      client: 6,
      utm: 1,
      createdDaysAgo: 2,
      mortgageMonths: 3,
    }, // trop tard → prochain cycle
    {
      funnel: 'AUTO',
      status: 'NURTURING',
      client: 6,
      utm: 2,
      createdDaysAgo: 70,
      mortgageMonths: 3,
    },
    { funnel: 'AUTO', status: 'NOUVEAU', client: 5, utm: 3, createdDaysAgo: 0, mortgageMonths: 26 },
    {
      funnel: 'AUTO',
      status: 'PERDU',
      client: 8,
      closer: 2,
      utm: 2,
      createdDaysAgo: 120,
      contactMinutes: 45,
      mortgageMonths: 36,
    },
  ]

  const closers = { 1: closer1, 2: closer2 }
  const partners = { 1: partner1, 2: partner2 }
  const leads = []

  for (const spec of specs) {
    const client = clients[spec.client]!
    const funnel: Funnel =
      spec.funnel === 'AUTO'
        ? renewalFunnel(monthsFromNow(spec.mortgageMonths ?? 24), NOW)
        : spec.funnel
    const createdAt = daysAgo(spec.createdDaysAgo)

    const lead = await prisma.lead.create({
      data: {
        funnel,
        status: spec.status,
        score: Math.min(95, 20 + spec.createdDaysAgo + (spec.closer ? 25 : 0)),
        locale: client.locale,
        name: client.name,
        email: client.email,
        phone: client.phone,
        ...UTM[spec.utm]!,
        userId: client.id,
        closerId: spec.closer ? closers[spec.closer].id : null,
        partnerId: spec.partner ? partners[spec.partner].id : null,
        createdAt,
      },
    })
    leads.push(lead)

    // Historique de statuts horodaté (speed-to-lead = NOUVEAU → CONTACTE).
    const targetIndex =
      spec.status === 'PERDU' || spec.status === 'NURTURING'
        ? PIPELINE.indexOf('CONTACTE') // parcours minimal avant sortie de pipeline
        : PIPELINE.indexOf(spec.status)

    let previous: LeadStatus | null = null
    let at = createdAt
    const reached: LeadStatus[] = ['NOUVEAU']
    if (spec.status !== 'NOUVEAU' && spec.status !== 'NURTURING') {
      for (let i = 1; i <= targetIndex; i++) reached.push(PIPELINE[i]!)
      if (spec.status === 'PERDU') reached.push('PERDU')
    }
    if (spec.status === 'NURTURING') reached.push('NURTURING')

    for (const [i, status] of reached.entries()) {
      if (i === 1) {
        // premier contact : le SLA < 5 min se mesure ici
        at = minutesAfter(createdAt, spec.contactMinutes ?? 5)
      } else if (i > 1) {
        at = minutesAfter(at, 60 * 24 * 2) // ~2 jours entre les étapes suivantes
      }
      await prisma.leadStatusChange.create({
        data: {
          leadId: lead.id,
          fromStatus: previous,
          toStatus: status,
          changedById: i === 0 ? null : spec.closer ? closers[spec.closer].id : null,
          changedAt: at,
        },
      })
      previous = status
    }
  }

  // ─── Signaux (file de travail des closers) ───────────────────────────
  const signalSpecs = [
    { lead: 5, type: 'ABANDON_DOSSIER', status: 'OUVERT' },
    { lead: 19, type: 'OFFRES_NON_LUES', status: 'OUVERT' },
    { lead: 20, type: 'OFFRE_EXPIRE_BIENTOT', status: 'OUVERT' },
    { lead: 22, type: 'ENTREE_FENETRE', status: 'OUVERT' },
    { lead: 11, type: 'GROSSE_ECONOMIE', status: 'OUVERT' }, // 480k à 2,10% vs 1,30%
    { lead: 13, type: 'CALLBACK_DEMANDE', status: 'TRAITE' },
    { lead: 23, type: 'ENTREE_FENETRE', status: 'TRAITE' },
  ] as const
  for (const s of signalSpecs) {
    await prisma.signal.create({
      data: {
        leadId: leads[s.lead]!.id,
        type: s.type,
        status: s.status,
        treatedAt: s.status === 'TRAITE' ? daysAgo(1) : null,
      },
    })
  }

  // ─── Offres (leads OFFRES_RECUES et SIGNE) ───────────────────────────
  const offerSpecs = [
    { lead: 19, lender: 'Raiffeisen', rate: 1.28, termYears: 10, validDays: 14, status: 'ACTIVE' },
    { lead: 19, lender: 'Swiss Life', rate: 1.32, termYears: 10, validDays: 10, status: 'ACTIVE' },
    { lead: 19, lender: 'Migros Bank', rate: 1.35, termYears: 5, validDays: 3, status: 'ACTIVE' },
    { lead: 20, lender: 'ZKB', rate: 1.25, termYears: 10, validDays: 12, status: 'ACTIVE' },
    { lead: 20, lender: 'UBS', rate: 1.38, termYears: 5, validDays: -2, status: 'EXPIREE' },
    {
      lead: 21,
      lender: 'Banque Cantonale Vaudoise',
      rate: 1.22,
      termYears: 10,
      validDays: -30,
      status: 'ACCEPTEE',
    },
    {
      lead: 21,
      lender: 'PostFinance',
      rate: 1.34,
      termYears: 10,
      validDays: -30,
      status: 'REFUSEE',
    },
    {
      lead: 8,
      lender: 'Raiffeisen',
      rate: 1.45,
      termYears: 10,
      validDays: -45,
      status: 'ACCEPTEE',
    },
  ] as const
  for (const o of offerSpecs) {
    await prisma.offer.create({
      data: {
        leadId: leads[o.lead]!.id,
        lender: o.lender,
        rate: o.rate,
        termYears: o.termYears,
        validUntil: daysAgo(-o.validDays),
        status: o.status,
      },
    })
  }

  // ─── Documents ───────────────────────────────────────────────────────
  const docSpecs = [
    { lead: 5, type: 'piece-identite', status: 'VALIDE' },
    { lead: 5, type: 'certificat-salaire', status: 'EN_ATTENTE' },
    { lead: 6, type: 'piece-identite', status: 'VALIDE' },
    { lead: 6, type: 'certificat-salaire', status: 'VALIDE' },
    { lead: 6, type: 'attestation-2e-pilier', status: 'VALIDE' },
    { lead: 17, type: 'contrat-hypothecaire-actuel', status: 'VALIDE' },
    { lead: 18, type: 'contrat-hypothecaire-actuel', status: 'REFUSE' },
  ] as const
  for (const d of docSpecs) {
    await prisma.document.create({
      data: {
        leadId: leads[d.lead]!.id,
        type: d.type,
        url: `https://storage.hypopilot.ch/dev/${leads[d.lead]!.id}/${d.type}.pdf`,
        verificationStatus: d.status,
      },
    })
  }

  // ─── Rendez-vous ─────────────────────────────────────────────────────
  const appointmentSpecs = [
    {
      lead: 4,
      closer: closer1,
      inDays: 1,
      type: 'APPEL',
      notes: 'Premier échange capacité d’achat',
    },
    {
      lead: 15,
      closer: closer1,
      inDays: 2,
      type: 'VISIO',
      notes: 'Présentation de la démarche d’appel d’offres',
    },
    {
      lead: 16,
      closer: closer2,
      inDays: 3,
      type: 'APPEL',
      notes: 'Rappel demandé en fin de journée',
    },
    { lead: 19, closer: closer1, inDays: 5, type: 'VISIO', notes: 'Revue des 3 offres reçues' },
  ] as const
  for (const a of appointmentSpecs) {
    await prisma.appointment.create({
      data: {
        leadId: leads[a.lead]!.id,
        closerId: a.closer.id,
        date: daysAgo(-a.inDays),
        type: a.type,
        notes: a.notes,
      },
    })
  }

  // ─── Commissions ─────────────────────────────────────────────────────
  const commissionSpecs = [
    { beneficiary: partner1.id, lead: 8, amount: 1_912.5, status: 'PAYEE' }, // apporteur, lead achat signé
    { beneficiary: partner1.id, lead: 21, amount: 3_240, status: 'DUE' }, // apporteur, renouvellement signé
    { beneficiary: closer1.id, lead: 8, amount: 850, status: 'PAYEE' },
    { beneficiary: closer1.id, lead: 21, amount: 1_080, status: 'DUE' },
  ] as const
  for (const c of commissionSpecs) {
    await prisma.commissionEntry.create({
      data: {
        beneficiaryId: c.beneficiary,
        leadId: leads[c.lead]!.id,
        amount: c.amount,
        status: c.status,
        paidAt: c.status === 'PAYEE' ? daysAgo(15) : null,
      },
    })
  }

  // ─── Base NPA suisse (GeoNames, CC-BY) ───────────────────────────────
  const npa = JSON.parse(
    readFileSync(path.join(__dirname, 'data', 'npa-ch.json'), 'utf8')
  ) as Array<{ npa: string; localite: string; canton: string }>
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
  await prisma.swissLocality.createMany({
    data: npa.map((l) => ({
      ...l,
      recherche: normalize(`${l.npa} ${l.localite} ${l.canton}`),
    })),
    skipDuplicates: true,
  })

  // ─── ~40 prêteurs suisses (autocomplete avec alias) ──────────────────
  const LENDERS_SEED: Array<{
    nom: string
    nomCourt: string
    alias: string[]
    type: 'BANQUE' | 'ASSURANCE' | 'CAISSE_PENSION'
  }> = [
    {
      nom: 'UBS',
      nomCourt: 'UBS',
      alias: ['ubs', 'union de banques suisses', 'credit suisse', 'cs'],
      type: 'BANQUE',
    },
    { nom: 'Raiffeisen', nomCourt: 'Raiffeisen', alias: ['raiffeisen'], type: 'BANQUE' },
    {
      nom: 'PostFinance',
      nomCourt: 'PostFinance',
      alias: ['postfinance', 'poste'],
      type: 'BANQUE',
    },
    { nom: 'Migros Bank', nomCourt: 'Migros Bank', alias: ['migros'], type: 'BANQUE' },
    {
      nom: 'Banque Cantonale Vaudoise',
      nomCourt: 'BCV',
      alias: ['bcv', 'vaudoise'],
      type: 'BANQUE',
    },
    {
      nom: 'Banque Cantonale du Valais',
      nomCourt: 'BCVs',
      alias: ['bcv', 'bcvs', 'valais'],
      type: 'BANQUE',
    },
    {
      nom: 'Banque Cantonale de Genève',
      nomCourt: 'BCGE',
      alias: ['bcge', 'geneve'],
      type: 'BANQUE',
    },
    {
      nom: 'Banque Cantonale de Fribourg',
      nomCourt: 'BCF',
      alias: ['bcf', 'fribourg'],
      type: 'BANQUE',
    },
    {
      nom: 'Banque Cantonale Neuchâteloise',
      nomCourt: 'BCN',
      alias: ['bcn', 'neuchatel'],
      type: 'BANQUE',
    },
    { nom: 'Banque Cantonale du Jura', nomCourt: 'BCJ', alias: ['bcj', 'jura'], type: 'BANQUE' },
    {
      nom: 'Zürcher Kantonalbank',
      nomCourt: 'ZKB',
      alias: ['zkb', 'zurcher', 'zurich kantonalbank'],
      type: 'BANQUE',
    },
    {
      nom: 'Berner Kantonalbank',
      nomCourt: 'BEKB',
      alias: ['bekb', 'bcbe', 'berne'],
      type: 'BANQUE',
    },
    {
      nom: 'Basler Kantonalbank',
      nomCourt: 'BKB',
      alias: ['bkb', 'basel', 'bale'],
      type: 'BANQUE',
    },
    {
      nom: 'Luzerner Kantonalbank',
      nomCourt: 'LUKB',
      alias: ['lukb', 'luzern', 'lucerne'],
      type: 'BANQUE',
    },
    {
      nom: 'St. Galler Kantonalbank',
      nomCourt: 'SGKB',
      alias: ['sgkb', 'st gallen', 'saint gall'],
      type: 'BANQUE',
    },
    {
      nom: 'Aargauische Kantonalbank',
      nomCourt: 'AKB',
      alias: ['akb', 'aargau', 'argovie'],
      type: 'BANQUE',
    },
    {
      nom: 'Thurgauer Kantonalbank',
      nomCourt: 'TKB',
      alias: ['tkb', 'thurgau', 'thurgovie'],
      type: 'BANQUE',
    },
    {
      nom: 'Graubündner Kantonalbank',
      nomCourt: 'GKB',
      alias: ['gkb', 'grisons', 'graubunden'],
      type: 'BANQUE',
    },
    {
      nom: 'Banca dello Stato del Cantone Ticino',
      nomCourt: 'BancaStato',
      alias: ['bancastato', 'ticino', 'tessin'],
      type: 'BANQUE',
    },
    { nom: 'Schwyzer Kantonalbank', nomCourt: 'SZKB', alias: ['szkb', 'schwyz'], type: 'BANQUE' },
    { nom: 'Zuger Kantonalbank', nomCourt: 'ZugerKB', alias: ['zug', 'zoug'], type: 'BANQUE' },
    { nom: 'Valiant', nomCourt: 'Valiant', alias: ['valiant'], type: 'BANQUE' },
    { nom: 'Hypothekarbank Lenzburg', nomCourt: 'HBL', alias: ['hbl', 'lenzburg'], type: 'BANQUE' },
    { nom: 'Cler', nomCourt: 'Banque Cler', alias: ['cler', 'coop'], type: 'BANQUE' },
    { nom: 'Banque WIR', nomCourt: 'WIR', alias: ['wir'], type: 'BANQUE' },
    {
      nom: "Caisse d'Épargne Riviera",
      nomCourt: 'CER',
      alias: ['riviera', 'caisse epargne'],
      type: 'BANQUE',
    },
    {
      nom: 'Crédit Agricole next bank',
      nomCourt: 'CA next bank',
      alias: ['credit agricole', 'ca next'],
      type: 'BANQUE',
    },
    {
      nom: 'Swiss Life',
      nomCourt: 'Swiss Life',
      alias: ['swisslife', 'swiss life'],
      type: 'ASSURANCE',
    },
    { nom: 'AXA', nomCourt: 'AXA', alias: ['axa', 'winterthur'], type: 'ASSURANCE' },
    { nom: 'Zurich Assurances', nomCourt: 'Zurich', alias: ['zurich'], type: 'ASSURANCE' },
    { nom: 'Helvetia', nomCourt: 'Helvetia', alias: ['helvetia'], type: 'ASSURANCE' },
    { nom: 'Bâloise', nomCourt: 'Bâloise', alias: ['baloise', 'basler'], type: 'ASSURANCE' },
    { nom: 'Generali', nomCourt: 'Generali', alias: ['generali'], type: 'ASSURANCE' },
    { nom: 'Allianz Suisse', nomCourt: 'Allianz', alias: ['allianz'], type: 'ASSURANCE' },
    {
      nom: 'La Mobilière',
      nomCourt: 'Mobilière',
      alias: ['mobiliere', 'mobiliar'],
      type: 'ASSURANCE',
    },
    { nom: 'Vaudoise Assurances', nomCourt: 'Vaudoise', alias: ['vaudoise'], type: 'ASSURANCE' },
    {
      nom: 'Retraites Populaires',
      nomCourt: 'Retraites Populaires',
      alias: ['retraites populaires', 'rp'],
      type: 'CAISSE_PENSION',
    },
    {
      nom: 'Caisse de pension Migros',
      nomCourt: 'CPM',
      alias: ['cpm', 'migros pension'],
      type: 'CAISSE_PENSION',
    },
    { nom: 'Publica', nomCourt: 'Publica', alias: ['publica'], type: 'CAISSE_PENSION' },
    { nom: 'CAP Prévoyance', nomCourt: 'CAP', alias: ['cap prevoyance'], type: 'CAISSE_PENSION' },
    { nom: 'Profond', nomCourt: 'Profond', alias: ['profond'], type: 'CAISSE_PENSION' },
  ]
  for (const lender of LENDERS_SEED) {
    await prisma.lender.create({ data: lender })
  }

  // ─── Dossier de démo avec 3 versions (Client → Closer → Admin) ───────
  const demoEcheance = monthsFromNow(11).toISOString().slice(0, 10)
  const demoBase: DossierData = {
    bien: {
      usage: 'RESIDENCE_PRINCIPALE',
      type: 'MAISON',
      annexe: false,
      npa: '1095',
      localite: 'Lutry',
      canton: 'VD',
      chauffage: 'pac',
      labelEco: 'minergie',
      droitHabitation: false,
      usufruit: false,
      droitSuperficie: false,
      zoneAgricole: false,
      valeur: 1_250_000,
      valeurSource: 'banque',
    },
    tranchesExistantes: [
      {
        lenderNom: 'Banque Cantonale Vaudoise',
        montant: 600_000,
        taux: 1.9,
        produit: 'FIXE',
        echeance: demoEcheance,
      },
      {
        lenderNom: 'Banque Cantonale Vaudoise',
        montant: 150_000,
        taux: 1.1,
        produit: 'SARON',
        echeance: demoEcheance,
      },
    ],
    autresPrets: [],
    ajustement: { sens: 'AUCUN' },
    montantTotal: 750_000,
    tranchesSouhaitees: [
      { produit: 'FIXE', dureeAnnees: 10, montant: 600_000, dateDebut: demoEcheance },
      { produit: 'SARON', montant: 150_000, dateDebut: demoEcheance },
    ],
    dateDebut: demoEcheance,
    emprunteurs: [
      {
        ordre: 1,
        prenom: 'Jean',
        nom: 'Rochat',
        nationalite: 'SUISSE',
        residenceFuture: 'HABITE_LE_BIEN',
        anneeNaissance: 1978,
        etatCivil: 'marie',
        employeur: 'Nestlé SA',
        aRevenu: true,
        aAvoirs: true,
        aCharges: true,
        aPoursuites: false,
        revenus: [
          {
            categorie: 'ACTIVITE',
            typeActivite: 'SALARIE',
            montantAnnuel: 165_000,
            bonus3Ans: false,
          },
        ],
        charges: [{ type: 'LEASING', montantAnnuel: 7_200, leasingFinAnnee: 2027 }],
        avoirs: [
          {
            categorie: 'BANQUE',
            typeBancaire: 'COMPTE_3A',
            montant: 85_000,
            utilisePourAchat: false,
          },
          { categorie: 'BANQUE', typeBancaire: 'COMPTE', montant: 120_000, utilisePourAchat: false },
        ],
        poursuites: [],
      },
    ],
    autresBiens: [],
    asks: { autresBiens: false, plusieursEmprunteurs: false },
  }
  const demoDossierId = 'demo-dossier-0001'
  await saveDossierVersion({
    dossierId: demoDossierId,
    funnel: 'RENOUVELLEMENT_CHAUD',
    locale: 'fr',
    data: demoBase,
    author: { type: 'LEAD', name: 'Client' },
  })
  // v2 : le closer corrige le taux et la valeur après appel
  await saveDossierVersion({
    dossierId: demoDossierId,
    funnel: 'RENOUVELLEMENT_CHAUD',
    data: {
      ...demoBase,
      bien: { ...demoBase.bien, valeur: 1_300_000 },
      tranchesExistantes: [
        { ...demoBase.tranchesExistantes[0]!, taux: 1.95 },
        demoBase.tranchesExistantes[1]!,
      ],
    },
    author: { type: 'CLOSER', id: closer1.id, name: 'Marc' },
    commentaire:
      'Valeur ajustée après appel client (estimation agence 2025) + taux confirmé sur le relevé.',
  })
  // v3 : l'admin complète le revenu bonus
  await saveDossierVersion({
    dossierId: demoDossierId,
    funnel: 'RENOUVELLEMENT_CHAUD',
    data: {
      ...demoBase,
      bien: { ...demoBase.bien, valeur: 1_300_000 },
      tranchesExistantes: [
        { ...demoBase.tranchesExistantes[0]!, taux: 1.95 },
        demoBase.tranchesExistantes[1]!,
      ],
      emprunteurs: [
        {
          ...demoBase.emprunteurs[0]!,
          revenus: [
            {
              categorie: 'ACTIVITE',
              typeActivite: 'SALARIE',
              montantAnnuel: 165_000,
              bonus3Ans: true,
              bonusMontants: [15_000, 14_000, 16_000],
            },
          ],
        },
      ],
    },
    author: { type: 'ADMIN', id: admin.id, name: 'Alice' },
    commentaire: 'Ajout du bonus contractuel (certificat de salaire).',
  })
  // rattacher le dossier démo au lead chaud du closer 1 (fiche complète)
  await prisma.dossier.update({
    where: { id: demoDossierId },
    data: { leadId: leads[13]!.id },
  })

  const counts = {
    users: await prisma.user.count(),
    leads: await prisma.lead.count(),
    statusChanges: await prisma.leadStatusChange.count(),
    signals: await prisma.signal.count(),
    offers: await prisma.offer.count(),
    rates: await prisma.referenceRate.count(),
    localites: await prisma.swissLocality.count(),
    lenders: await prisma.lender.count(),
    dossierVersions: await prisma.dossierVersion.count(),
  }
  console.log('Seed terminé :', counts)
  console.log(`(admin : ${admin.email} / Password123!)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
