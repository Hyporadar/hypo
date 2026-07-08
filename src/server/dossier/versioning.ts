// NB : pas de « server-only » ici — le seed (tsx) réutilise cette logique.
// Le module reste serveur par construction (import Prisma).
import type { Funnel, Locale, Prisma, VersionAuthor } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  dossierDataSchema,
  detectComplexReasons,
  echeanceProche,
  validateTranches,
  type DossierData,
} from '@/lib/dossier/schema'
import { computeCompleteness } from '@/lib/dossier/completeness'

// ─── Versionnage immuable du dossier ───────────────────────────────────
// RÈGLE CENTRALE : le dossier n'est JAMAIS modifié en place. Chaque
// sauvegarde crée une DossierVersion (snapshot JSON) et reprojette l'état
// courant dans les tables structurées. Aucune suppression, jamais —
// c'est la traçabilité LSFin/LBA.

export interface VersionAuthorInput {
  type: VersionAuthor
  id?: string | null
  name: string
}

export class DossierError extends Error {
  constructor(public code: 'invalid' | 'tranches' | 'commentaire' | 'forbidden' | 'not-found') {
    super(code)
  }
}

// ── Mapping v2 (formulaire-complet.md) → enums Prisma des tables
// structurées. Les tables servent aux requêtes admin (tri, filtres) ;
// la vérité exhaustive reste le JSON de DossierVersion.data.
type BienData = DossierData['bien']
type RevenuData = DossierData['emprunteurs'][number]['revenus'][number]
type ChargeData = DossierData['emprunteurs'][number]['charges'][number]
type AvoirData = DossierData['emprunteurs'][number]['avoirs'][number]

function mapUsage(usage: BienData['usage']) {
  if (usage === 'VACANCES') return 'RESIDENCE_SECONDAIRE' as const
  if (usage === 'LOUE_PARTIEL') return 'RENDEMENT' as const
  return usage ?? null
}
function mapTypeBien(type: BienData['type']) {
  if (type === 'PLUSIEURS_APPARTEMENTS' || type === 'GRAND_ENSEMBLE') return 'IMMEUBLE' as const
  return type ?? null
}
function mapRevenuType(r: RevenuData) {
  if (r.type) return r.type
  if (r.categorie === 'ACTIVITE') {
    return r.typeActivite === 'INDEPENDANT' ? ('INDEPENDANT' as const) : ('SALAIRE' as const)
  }
  if (r.categorie === 'RENTE') return 'RENTE' as const
  if (r.typeAutre === 'LOCATIF') return 'REVENU_LOCATIF' as const
  return 'AUTRE' as const
}
function mapChargeType(c: ChargeData) {
  if (c.type === 'CREDIT_CONSO') return 'CREDIT' as const
  if (c.type === 'INTERETS_PRET') return 'AUTRE' as const
  return c.type
}
function mapAvoirType(a: AvoirData) {
  if (a.type) return a.type
  if (a.categorie === 'CAISSE_PENSION') return 'CAPITAL_LPP' as const
  if (a.categorie === 'ASSURANCE' || a.categorie === 'AUTRE') return 'AUTRE' as const
  switch (a.typeBancaire) {
    case 'TITRES':
      return 'TITRES' as const
    case 'COMPTE_3A':
    case 'TITRES_3A':
      return 'PILIER_3A' as const
    case 'LIBRE_PASSAGE':
      return 'LIBRE_PASSAGE' as const
    default:
      return 'COMPTE_EPARGNE' as const
  }
}

export interface SaveDossierInput {
  dossierId: string // uuid client (dossier anonyme) ou existant
  funnel: Funnel
  locale?: Locale
  data: unknown
  author: VersionAuthorInput
  commentaire?: string | null
  parentVersionId?: string | null
}

/** Sauvegarde = nouvelle version immuable + reprojection de l'état courant. */
export async function saveDossierVersion(input: SaveDossierInput) {
  const parsed = dossierDataSchema.safeParse(input.data)
  if (!parsed.success) throw new DossierError('invalid')
  const data = parsed.data

  // Invariant multi-tranches : somme = montant total dérivé.
  if (!validateTranches(data, input.funnel).ok) throw new DossierError('tranches')

  // Un closer justifie TOUJOURS sa modification.
  if (input.author.type === 'CLOSER' && !input.commentaire?.trim()) {
    throw new DossierError('commentaire')
  }

  const complexReasons = detectComplexReasons(data)
  const completeness = computeCompleteness(input.funnel, data)
  const echeance = echeanceProche(data)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.dossier.findUnique({
      where: { id: input.dossierId },
      select: { id: true, complex: true, locale: true },
    })

    const dossier = existing
      ? await tx.dossier.update({
          where: { id: input.dossierId },
          data: {
            funnel: input.funnel,
            complex: complexReasons.length > 0,
            complexReasons,
            completude: completeness.percent,
            echeanceProche: echeance,
            lastActivityAt: new Date(),
          },
        })
      : await tx.dossier.create({
          data: {
            id: input.dossierId,
            funnel: input.funnel,
            locale: input.locale ?? 'fr',
            complex: complexReasons.length > 0,
            complexReasons,
            completude: completeness.percent,
            echeanceProche: echeance,
            lastActivityAt: new Date(),
          },
        })

    // ── Version immuable n+1
    const last = await tx.dossierVersion.findFirst({
      where: { dossierId: dossier.id },
      orderBy: { numero: 'desc' },
      select: { id: true, numero: true },
    })
    const version = await tx.dossierVersion.create({
      data: {
        dossierId: dossier.id,
        numero: (last?.numero ?? 0) + 1,
        data: data as Prisma.InputJsonValue,
        authorType: input.author.type,
        authorId: input.author.id ?? null,
        authorName: input.author.name,
        commentaire: input.commentaire?.trim() || null,
        parentVersionId: input.parentVersionId ?? last?.id ?? null,
      },
    })
    await tx.dossier.update({
      where: { id: dossier.id },
      data: { currentVersionId: version.id },
    })

    // ── Reprojection de l'état courant (tables structurées)
    await tx.bien.deleteMany({ where: { dossierId: dossier.id } })
    await tx.trancheExistante.deleteMany({ where: { dossierId: dossier.id } })
    await tx.trancheSouhaitee.deleteMany({ where: { dossierId: dossier.id } })
    await tx.emprunteur.deleteMany({ where: { dossierId: dossier.id } })
    await tx.autreBien.deleteMany({ where: { dossierId: dossier.id } })

    await tx.bien.create({
      data: {
        dossierId: dossier.id,
        usage: mapUsage(data.bien.usage),
        type: mapTypeBien(data.bien.type),
        position: data.bien.position ?? null,
        rue: data.bien.rue ?? null,
        npa: data.bien.npa ?? null,
        localite: data.bien.localite ?? null,
        canton: data.bien.canton ?? null,
        lat: data.bien.lat ?? null,
        lng: data.bien.lng ?? null,
        geoConfirme: data.bien.geoConfirme ?? false,
        anneeConstruction: data.bien.anneeConstruction ?? null,
        anneeRenovation: data.bien.anneeRenovation ?? null,
        pieces: data.bien.pieces ?? null,
        sallesEau: (data.bien.sallesEau as Prisma.InputJsonValue) ?? undefined,
        surfaceHabitable: data.bien.surfaceHabitable ?? null,
        chauffage: data.bien.chauffage ?? null,
        labelEco: data.bien.labelEco ?? null,
        etatCuisine: data.bien.etatCuisine ?? null,
        etatSallesBains: data.bien.etatSallesBains ?? null,
        etatInterieur: data.bien.etatInterieur ?? null,
        etatExterieur: data.bien.etatExterieur ?? null,
        servitudes:
          (data.bien.servitudes ||
            data.bien.droitHabitation ||
            data.bien.usufruit ||
            data.bien.droitSuperficie) ??
          null,
        zoneAgricole: data.bien.zoneAgricole ?? null,
        nouvelleConstruction:
          (data.bien.nouvelleConstruction || data.bien.bienExistant === false) ?? null,
        valeur: data.bien.valeur ?? null,
        prixAchat: data.bien.prixAchat ?? null,
        fondsPropres: data.bien.fondsPropres ?? null,
      },
    })
    for (const [i, t] of data.tranchesExistantes.entries()) {
      await tx.trancheExistante.create({
        data: {
          dossierId: dossier.id,
          ordre: i + 1,
          lenderId: t.lenderId ?? null,
          lenderNom: t.lenderNom ?? null,
          montant: t.montant,
          taux: t.taux ?? null,
          produit: t.produit,
          echeance: t.echeance ? new Date(t.echeance) : null,
        },
      })
    }
    for (const [i, t] of data.tranchesSouhaitees.entries()) {
      await tx.trancheSouhaitee.create({
        data: {
          dossierId: dossier.id,
          ordre: i + 1,
          produit: t.produit,
          dureeAnnees: t.dureeAnnees ?? null,
          montant: t.montant,
        },
      })
    }
    for (const e of data.emprunteurs) {
      await tx.emprunteur.create({
        data: {
          dossierId: dossier.id,
          ordre: e.ordre,
          prenom: e.prenom ?? null,
          nom: e.nom ?? null,
          anneeNaissance: e.anneeNaissance ?? null,
          etatCivil: e.etatCivil ?? null,
          nationalite: e.nationalite ?? null,
          permis: e.permis ?? null,
          statutActivite: e.statutActivite ?? null,
          dureeActiviteRestanteMois: e.dureeActiviteRestanteMois ?? null,
          employeur: e.employeur ?? null,
          revenus: {
            create: e.revenus.map((r) => ({
              type: mapRevenuType(r),
              montantAnnuel: r.montantAnnuel,
              libelle: r.libelle ?? null,
            })),
          },
          charges: {
            create: e.charges.map((c) => ({
              type: mapChargeType(c),
              montantAnnuel: c.montantAnnuel,
              echeanceLeasing: c.echeanceLeasing
                ? new Date(c.echeanceLeasing)
                : c.leasingFinAnnee
                  ? new Date(Date.UTC(c.leasingFinAnnee, 11, 31))
                  : null,
            })),
          },
          avoirs: {
            create: e.avoirs.map((a) => ({
              type: mapAvoirType(a),
              montant: a.montant,
              utilisePourAchat: a.utilisePourAchat,
            })),
          },
          poursuites: {
            create: e.poursuites.map((p) => ({
              soldee: p.soldee,
              montant: p.montant ?? null,
              motif: p.motif ?? p.origine ?? null,
            })),
          },
        },
      })
    }
    for (const b of data.autresBiens) {
      await tx.autreBien.create({
        data: {
          dossierId: dossier.id,
          type: b.type ?? b.genre ?? null,
          valeur: b.valeur ?? null,
          hypothequeRestante: b.hypothequeRestante ?? null,
          revenuLocatifAnnuel: b.revenuLocatifAnnuel ?? null,
        },
      })
    }

    // ── Événements
    await tx.dossierEvent.create({
      data: {
        dossierId: dossier.id,
        type: 'VERSION_CREATED',
        actorType: input.author.type,
        actorId: input.author.id ?? null,
        data: { numero: version.numero, authorName: input.author.name },
      },
    })
    if (complexReasons.length > 0 && !existing?.complex) {
      await tx.dossierEvent.create({
        data: {
          dossierId: dossier.id,
          type: 'COMPLEX_CASE_DETECTED',
          data: { reasons: complexReasons },
        },
      })
    }

    return { dossier, version, completeness }
  })
}

/** Restauration : copie d'une ancienne version EN NOUVELLE version (rien n'est supprimé). */
export async function restoreVersion(
  dossierId: string,
  numero: number,
  author: VersionAuthorInput
) {
  const [dossier, source] = await Promise.all([
    prisma.dossier.findUnique({ where: { id: dossierId }, select: { funnel: true, locale: true } }),
    prisma.dossierVersion.findUnique({
      where: { dossierId_numero: { dossierId, numero } },
    }),
  ])
  if (!dossier || !source) throw new DossierError('not-found')

  return saveDossierVersion({
    dossierId,
    funnel: dossier.funnel,
    locale: dossier.locale,
    data: source.data as DossierData,
    author,
    commentaire: `Restauration de la v${numero}`,
    parentVersionId: source.id,
  })
}

// ─── Permissions (modèle Kala : un panel, accès par rôle) ──────────────

export interface PanelUser {
  id: string
  role: string
}

/** ADMIN : tout. CLOSER : uniquement les dossiers dont le lead lui est assigné. */
export async function assertCanEditDossier(user: PanelUser, dossierId: string): Promise<void> {
  if (user.role === 'ADMIN') return
  if (user.role !== 'CLOSER') throw new DossierError('forbidden')
  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    select: { lead: { select: { closerId: true } } },
  })
  if (!dossier) throw new DossierError('not-found')
  if (dossier.lead?.closerId !== user.id) throw new DossierError('forbidden')
}

/** PARTNER : lecture seule de ses apports, sous-ensemble non financier. */
export async function canViewDossier(
  user: PanelUser,
  dossierId: string
): Promise<{ ok: boolean; financials: boolean }> {
  if (user.role === 'ADMIN') return { ok: true, financials: true }
  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    select: { lead: { select: { closerId: true, partnerId: true } } },
  })
  if (!dossier) return { ok: false, financials: false }
  if (user.role === 'CLOSER') {
    return { ok: dossier.lead?.closerId === user.id, financials: true }
  }
  if (user.role === 'PARTNER') {
    return { ok: dossier.lead?.partnerId === user.id, financials: false }
  }
  return { ok: false, financials: false }
}

/** Audit léger : toute lecture par un rôle interne est journalisée. */
export async function recordConsultation(
  dossierId: string,
  user: PanelUser & { name?: string }
): Promise<void> {
  await prisma.dossierEvent.create({
    data: {
      dossierId,
      type: 'CONSULTATION',
      actorType: user.role === 'ADMIN' ? 'ADMIN' : user.role === 'CLOSER' ? 'CLOSER' : 'SYSTEM',
      actorId: user.id,
      data: { role: user.role, name: user.name ?? null },
    },
  })
}

/** Masque les données financières pour un PARTNER (jamais de détail client). */
export function stripFinancials(data: DossierData): DossierData {
  return {
    ...data,
    emprunteurs: data.emprunteurs.map((e) => ({
      ...e,
      anneeNaissance: null,
      revenus: [],
      charges: [],
      avoirs: [],
      poursuites: [],
    })),
    tranchesExistantes: [],
    autresPrets: [],
    ajustement: {},
    montantTotal: null,
    tranchesSouhaitees: [],
  }
}
