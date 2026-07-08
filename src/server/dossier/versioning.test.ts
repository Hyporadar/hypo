import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  assertCanEditDossier,
  canViewDossier,
  restoreVersion,
  saveDossierVersion,
  stripFinancials,
} from '@/server/dossier/versioning'
import { diffVersions } from '@/lib/dossier/diff'
import { computeCompleteness } from '@/lib/dossier/completeness'
import { calibrateOffers } from '@/lib/dossier/calibration'
import { detectComplexReasons, validateTranches, type DossierData } from '@/lib/dossier/schema'

// Tests d'intégration sur la base locale — préfixe « test-vers- » nettoyé.

const PREFIX = 'test-vers-'
const RATES = { saron: 0.9, fixed: { 5: 1.3, 10: 1.75, 15: 2.0 } }

const baseData: DossierData = {
  bien: {
    usage: 'RESIDENCE_PRINCIPALE',
    type: 'MAISON',
    annexe: false,
    npa: '1003',
    localite: 'Lausanne',
    canton: 'VD',
    labelEco: 'non',
    chauffage: 'gaz',
    droitHabitation: false,
    usufruit: false,
    droitSuperficie: false,
    zoneAgricole: false,
    valeur: 1_000_000,
    valeurSource: 'propre',
  },
  tranchesExistantes: [
    { lenderNom: 'UBS', montant: 650_000, taux: 1.9, produit: 'FIXE', echeance: '2027-06-01' },
  ],
  autresPrets: [],
  ajustement: { sens: 'AUCUN' },
  montantTotal: 650_000,
  tranchesSouhaitees: [
    { produit: 'FIXE', dureeAnnees: 10, montant: 650_000, dateDebut: '2027-06-01' },
  ],
  dateDebut: '2027-06-01',
  emprunteurs: [
    {
      ordre: 1,
      nationalite: 'SUISSE',
      residenceFuture: 'HABITE_LE_BIEN',
      anneeNaissance: 1980,
      aRevenu: true,
      aAvoirs: true,
      aCharges: false,
      aPoursuites: false,
      revenus: [{ categorie: 'ACTIVITE', typeActivite: 'SALARIE', montantAnnuel: 180_000 }],
      charges: [],
      avoirs: [
        { categorie: 'BANQUE', typeBancaire: 'COMPTE_3A', montant: 50_000, utilisePourAchat: false },
      ],
      poursuites: [],
    },
  ],
  autresBiens: [],
  asks: { autresBiens: false, plusieursEmprunteurs: false },
}

async function cleanup() {
  await prisma.dossier.deleteMany({ where: { id: { startsWith: PREFIX } } })
}

beforeAll(cleanup)
afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('versionnage immuable', () => {
  const id = `${PREFIX}main`

  it('chaque sauvegarde crée une version n+1 avec le bon auteur', async () => {
    const v1 = await saveDossierVersion({
      dossierId: id,
      funnel: 'RENOUVELLEMENT_CHAUD',
      locale: 'fr',
      data: baseData,
      author: { type: 'LEAD', name: 'Client' },
    })
    expect(v1.version.numero).toBe(1)
    expect(v1.version.authorType).toBe('LEAD')

    const v2 = await saveDossierVersion({
      dossierId: id,
      funnel: 'RENOUVELLEMENT_CHAUD',
      data: { ...baseData, bien: { ...baseData.bien, valeur: 1_100_000 } },
      author: { type: 'ADMIN', id: 'admin-1', name: 'Alice' },
    })
    expect(v2.version.numero).toBe(2)
    expect(v2.version.authorType).toBe('ADMIN')
    expect(v2.version.parentVersionId).toBe(v1.version.id)

    const dossier = await prisma.dossier.findUniqueOrThrow({
      where: { id },
      include: { bien: true, versions: true },
    })
    expect(dossier.currentVersionId).toBe(v2.version.id)
    expect(dossier.versions).toHaveLength(2)
    // état courant reprojeté
    expect(Number(dossier.bien!.valeur)).toBe(1_100_000)
  })

  it('un closer sans commentaire est rejeté', async () => {
    await expect(
      saveDossierVersion({
        dossierId: id,
        funnel: 'RENOUVELLEMENT_CHAUD',
        data: baseData,
        author: { type: 'CLOSER', id: 'closer-1', name: 'Marc' },
      })
    ).rejects.toMatchObject({ code: 'commentaire' })
  })

  it('somme des tranches ≠ total → rejet', async () => {
    await expect(
      saveDossierVersion({
        dossierId: `${PREFIX}tranches`,
        funnel: 'RENOUVELLEMENT_CHAUD',
        data: {
          ...baseData,
          montantTotal: 650_000,
          tranchesSouhaitees: [
            { produit: 'FIXE', dureeAnnees: 10, montant: 400_000 },
            { produit: 'SARON', montant: 200_000 }, // 600k ≠ 650k
          ],
        },
        author: { type: 'LEAD', name: 'Client' },
      })
    ).rejects.toMatchObject({ code: 'tranches' })
  })

  it('restaurer une ancienne version crée une NOUVELLE version, sans rien supprimer', async () => {
    const restored = await restoreVersion(id, 1, { type: 'ADMIN', id: 'admin-1', name: 'Alice' })
    expect(restored.version.numero).toBe(3)
    expect(restored.version.commentaire).toContain('Restauration de la v1')

    const versions = await prisma.dossierVersion.findMany({
      where: { dossierId: id },
      orderBy: { numero: 'asc' },
    })
    expect(versions).toHaveLength(3) // v1 et v2 toujours là
    // la v3 est une copie de la v1
    const v1data = versions[0]!.data as DossierData
    const v3data = versions[2]!.data as DossierData
    expect(v3data.bien.valeur).toBe(v1data.bien.valeur)
    // état courant revenu à la valeur de v1
    const bien = await prisma.bien.findUniqueOrThrow({ where: { dossierId: id } })
    expect(Number(bien.valeur)).toBe(1_000_000)
  })

  it('le diff entre versions liste les champs modifiés avec libellés humains', async () => {
    const versions = await prisma.dossierVersion.findMany({
      where: { dossierId: id },
      orderBy: { numero: 'asc' },
    })
    const entries = diffVersions(versions[0]!.data, versions[1]!.data)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      label: 'Bien · Valeur du bien',
      before: '1000000',
      after: '1100000',
    })
  })
})

describe('permissions par rôle', () => {
  const id = `${PREFIX}perm`
  let closerId = ''
  let partnerId = ''

  beforeAll(async () => {
    const [closer, partner] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { role: 'CLOSER' } }),
      prisma.user.findFirstOrThrow({ where: { role: 'PARTNER' } }),
    ])
    closerId = closer.id
    partnerId = partner.id

    await saveDossierVersion({
      dossierId: id,
      funnel: 'ACHAT',
      locale: 'fr',
      data: baseData,
      author: { type: 'LEAD', name: 'Client' },
    })
    const lead = await prisma.lead.create({
      data: {
        funnel: 'ACHAT',
        status: 'NOUVEAU',
        locale: 'fr',
        name: 'Perm Test',
        email: `perm@${PREFIX}local`,
        closerId,
        partnerId,
      },
    })
    await prisma.dossier.update({ where: { id }, data: { leadId: lead.id } })
  })

  it('le closer assigné peut éditer, un autre closer non', async () => {
    await expect(
      assertCanEditDossier({ id: closerId, role: 'CLOSER' }, id)
    ).resolves.toBeUndefined()
    await expect(
      assertCanEditDossier({ id: 'autre-closer', role: 'CLOSER' }, id)
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('un partner voit ses apports SANS les données financières', async () => {
    const view = await canViewDossier({ id: partnerId, role: 'PARTNER' }, id)
    expect(view).toEqual({ ok: true, financials: false })

    const stripped = stripFinancials(baseData)
    expect(stripped.emprunteurs[0]!.revenus).toHaveLength(0)
    expect(stripped.emprunteurs[0]!.anneeNaissance).toBeNull()
    expect(stripped.montantTotal).toBeNull()
    // le non-financier reste visible
    expect(stripped.bien.localite).toBe('Lausanne')
  })

  it("un partner étranger au dossier n'y accède pas", async () => {
    const view = await canViewDossier({ id: 'autre-partner', role: 'PARTNER' }, id)
    expect(view.ok).toBe(false)
  })
})

describe('règles pures', () => {
  it('complétude : dossier vide ≈ 0%, dossier complet = 100%', () => {
    const empty = computeCompleteness('RENOUVELLEMENT_CHAUD', {
      bien: {},
      tranchesExistantes: [],
      autresPrets: [],
      ajustement: {},
      montantTotal: null,
      tranchesSouhaitees: [],
      dateDebut: null,
      emprunteurs: [],
      autresBiens: [],
      asks: {},
    })
    expect(empty.percent).toBe(0)
    expect(empty.missingBySection.bien.length).toBeGreaterThan(5)

    const full = computeCompleteness('RENOUVELLEMENT_CHAUD', baseData)
    expect(full.percent).toBe(100)
    expect(full.missing).toHaveLength(0)
  })

  it('calibration : label éco baisse le taux, LTV élevée le monte, complet = calibré', () => {
    const eco = calibrateOffers(
      'RENOUVELLEMENT_CHAUD',
      { ...baseData, bien: { ...baseData.bien, labelEco: 'Minergie' } },
      RATES,
      [10]
    )
    const sansEco = calibrateOffers('RENOUVELLEMENT_CHAUD', baseData, RATES, [10])
    const banqueEco = eco.offers.find((o) => o.lenderType === 'BANQUE')!
    const banqueSans = sansEco.offers.find((o) => o.lenderType === 'BANQUE')!
    expect(banqueEco.min).toBeLessThan(banqueSans.min)
    expect(eco.adjustments).toContain('ecoDiscount')
    expect(eco.calibrated).toBe(true) // dossier complet → fourchette calibrée

    // LTV élevée via une augmentation d'hypothèque (le montant total est dérivé).
    const highLtv = calibrateOffers(
      'RENOUVELLEMENT_CHAUD',
      {
        ...baseData,
        ajustement: { sens: 'AUGMENTER', montant: 200_000, raison: 'renovation' },
        tranchesSouhaitees: [{ produit: 'FIXE', dureeAnnees: 10, montant: 850_000 }],
      },
      RATES,
      [10]
    )
    expect(highLtv.adjustments).toContain('ltvHigh')
    expect(highLtv.offers.find((o) => o.lenderType === 'BANQUE')!.min).toBeGreaterThan(
      banqueSans.min
    )
  })

  it('cas complexes : poursuite non soldée détectée', () => {
    const reasons = detectComplexReasons({
      ...baseData,
      emprunteurs: [
        {
          ...baseData.emprunteurs[0]!,
          poursuites: [{ soldee: false, montant: 5_000, motif: null }],
        },
      ],
    })
    expect(reasons).toContain('poursuite-non-soldee')
    expect(validateTranches(baseData).ok).toBe(true)
  })
})
