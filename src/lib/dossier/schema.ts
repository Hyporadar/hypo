import { z } from 'zod'
import type { Funnel } from '@prisma/client'

// ─── DossierData : le format canonique du snapshot JSON ────────────────
// C'est CE format qui est figé dans DossierVersion.data (vérité immuable)
// et projeté dans les tables structurées (état courant). Tout est optionnel :
// le wizard sauvegarde à chaque étape, la complétude se mesure à part.
// Inventaire des champs calé sur docs/formulaire-complet.md (fait foi).
// Les champs marqués « héritage » restent acceptés pour relire les
// anciennes versions ; le wizard client ne les écrit plus.

const montant = z.number().min(0).max(100_000_000)
const annee = z
  .number()
  .int()
  .min(1850)
  .max(new Date().getFullYear() + 3)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const bienSchema = z.object({
  // 1.1 Usage + branches locatives (formulaire-complet §1.1)
  usage: z
    .enum([
      'RESIDENCE_PRINCIPALE',
      'VACANCES',
      'RENDEMENT',
      'LOUE_PARTIEL',
      'RESIDENCE_SECONDAIRE', // héritage (≈ VACANCES)
    ])
    .nullish(),
  vacancesOccupation: z.enum(['OCCUPE', 'LOUE_ET_OCCUPE', 'LOUE']).nullish(),
  locatifUsage: z.enum(['RESIDENTIEL', 'MIXTE', 'COMMERCIAL']).nullish(),
  locatifTypeLocation: z.enum(['PERMANENT', 'TEMPORAIRE']).nullish(),
  revenuLocatifAnnuel: montant.nullish(), // CHF net/an hors charges

  // Type de bien (liste étendue si usage loué) + appartement annexe
  type: z
    .enum([
      'MAISON',
      'APPARTEMENT_PPE',
      'MAISON_MITOYENNE',
      'PLUSIEURS_APPARTEMENTS',
      'GRAND_ENSEMBLE',
      'IMMEUBLE', // héritage
    ])
    .nullish(),
  annexe: z.boolean().nullish(), // Einliegerwohnung (maison individuelle)
  annexeLouee: z.boolean().nullish(),
  revenuAnnexeAnnuel: montant.nullish(),

  // Adresse : NPA/localité seulement en année 1 (rue+carte = wizard d'évaluation)
  npa: z.string().max(10).nullish(),
  localite: z.string().max(100).nullish(),
  canton: z.string().max(2).nullish(),

  // Standard écologique (explicite, « non » compris) + chauffage
  labelEco: z.string().max(60).nullish(), // non|minergie|geak-cecb|snbs|autre
  chauffage: z.string().max(60).nullish(), // mazout|gaz|pac|distance|bois|electrique|autre

  // Cas spéciaux : 4 × Non/Oui — un Oui tague le dossier, aucune sous-question
  droitHabitation: z.boolean().nullish(),
  usufruit: z.boolean().nullish(),
  droitSuperficie: z.boolean().nullish(),
  zoneAgricole: z.boolean().nullish(),

  // 1.2 Spécifique achat
  bienExistant: z.boolean().nullish(), // false = nouvelle construction → contact direct
  prixAchat: montant.nullish(),
  dateAchatFixee: z.boolean().nullish(), // date d'inscription au RF
  dateAchat: isoDate.nullish(),
  renovationImmediate: z.boolean().nullish(),
  fondsPropres: montant.nullish(), // slider du configurateur (section 3)

  // 1.3 Valeur du bien + source de l'estimation
  valeur: montant.nullish(),
  valeurSource: z.string().max(40).nullish(), // banque|en-ligne|agent|expert|propre

  // ── Héritage + réserve wizard d'évaluation (année 2) ──
  position: z.enum(['INDIVIDUELLE', 'JUMELEE', 'MITOYENNE_CENTRALE', 'MITOYENNE_ANGLE']).nullish(),
  rue: z.string().max(200).nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  geoConfirme: z.boolean().nullish(),
  anneeConstruction: annee.nullish(),
  anneeRenovation: annee.nullish(),
  pieces: z.number().min(1).max(30).nullish(),
  sallesEau: z
    .object({
      baignoires: z.number().int().min(0).max(10),
      douches: z.number().int().min(0).max(10),
      wc: z.number().int().min(0).max(10),
    })
    .nullish(),
  surfaceHabitable: z.number().int().min(10).max(1_000).nullish(),
  etatCuisine: z.number().int().min(1).max(7).nullish(),
  etatSallesBains: z.number().int().min(1).max(7).nullish(),
  etatInterieur: z.number().int().min(1).max(7).nullish(),
  etatExterieur: z.number().int().min(1).max(7).nullish(),
  servitudes: z.boolean().nullish(), // héritage (remplacé par les 4 cas spéciaux)
  nouvelleConstruction: z.boolean().nullish(), // héritage (remplacé par bienExistant)
})

export const trancheExistanteSchema = z.object({
  lenderId: z.string().nullish(),
  lenderNom: z.string().max(160).nullish(),
  montant: montant,
  taux: z.number().min(0).max(15).nullish(),
  produit: z.enum(['FIXE', 'SARON', 'VARIABLE']).default('FIXE'),
  echeance: isoDate.nullish(),
})

// §1.5 achat — autres prêts liés au bien (prêt privé / vendeur)
export const autrePretSchema = z.object({
  montant: montant,
  libelle: z.string().max(160).nullish(),
})

// §3 configurateur — tranche souhaitée (SARON · Variable · Fixe 1..20 ans)
export const trancheSouhaiteeSchema = z.object({
  produit: z.enum(['FIXE', 'SARON', 'VARIABLE']).default('FIXE'),
  dureeAnnees: z.number().int().min(1).max(25).nullish(),
  montant: montant,
  dateDebut: isoDate.nullish(), // renouvellement : échéance de l'ancienne tranche
})

// §3.1 renouvellement — ajustement global du montant
export const ajustementSchema = z.object({
  sens: z.enum(['AUCUN', 'REDUIRE', 'AUGMENTER']).nullish(),
  montant: montant.nullish(),
  raison: z.string().max(40).nullish(), // renovation|agrandissement|les-deux|autre (si AUGMENTER)
})

// §2.2 revenus — 3 catégories avec toutes les sous-listes
export const revenuSchema = z.object({
  categorie: z.enum(['ACTIVITE', 'RENTE', 'AUTRE']).nullish(),
  typeActivite: z
    .enum(['SALARIE', 'INDEPENDANT', 'ACCESSOIRE', 'CHOMAGE', 'ETRANGER'])
    .nullish(),
  typeRente: z
    .enum(['AVS_AI', 'AI_3E_PILIER', 'SURVIVANT', 'ENFANT', 'VIAGERE', 'ETRANGERE'])
    .nullish(),
  typeAutre: z.enum(['PENSION_ALIMENTAIRE', 'DIVIDENDES', 'LOCATIF']).nullish(),
  montantAnnuel: montant,
  bonus3Ans: z.boolean().nullish(), // salarié : bonus au cours des 3 dernières années ?
  bonusMontants: z.array(montant).max(3).nullish(),
  independantPlus3Ans: z.boolean().nullish(),
  independantDepuisMois: z.number().int().min(0).max(600).nullish(), // curseur 3/6/12/24/36
  // héritage
  type: z.enum(['SALAIRE', 'BONUS', 'INDEPENDANT', 'RENTE', 'REVENU_LOCATIF', 'AUTRE']).nullish(),
  libelle: z.string().max(120).nullish(),
})

// §2.4 charges — 4 types (« les autres dépenses ne doivent PAS être saisies »)
export const chargeSchema = z.object({
  type: z.enum([
    'PENSION_ALIMENTAIRE',
    'LEASING',
    'CREDIT_CONSO',
    'INTERETS_PRET',
    'CREDIT', // héritage
    'AUTRE', // héritage
  ]),
  montantAnnuel: montant,
  leasingFinAnnee: z.number().int().min(2020).max(2060).nullish(), // curseur 2026..2030+
  echeanceLeasing: isoDate.nullish(), // héritage
})

// §2.3 avoirs — 4 catégories, 5 types bancaires
export const avoirSchema = z.object({
  categorie: z.enum(['BANQUE', 'ASSURANCE', 'CAISSE_PENSION', 'AUTRE']).nullish(),
  typeBancaire: z
    .enum(['COMPTE', 'TITRES', 'COMPTE_3A', 'TITRES_3A', 'LIBRE_PASSAGE'])
    .nullish(),
  montant: montant,
  utilisePourAchat: z.boolean().default(false),
  // héritage
  type: z
    .enum([
      'COMPTE_EPARGNE',
      'TITRES',
      'PILIER_3A',
      'LIBRE_PASSAGE',
      'CAPITAL_LPP',
      'DONATION',
      'AUTRE',
    ])
    .nullish(),
})

// §2.5 poursuites — origine + montant + soldée
export const poursuiteSchema = z.object({
  origine: z.enum(['FISC', 'JEU', 'LEASING', 'INTERETS', 'AUTRE']).nullish(),
  soldee: z.boolean(),
  montant: montant.nullish(),
  motif: z.string().max(300).nullish(), // héritage
})

export const emprunteurSchema = z.object({
  ordre: z.number().int().min(1).max(4),
  // §2.1 données personnelles
  nationalite: z.string().max(60).nullish(), // SUISSE|AUTRE|PLUSIEURS (héritage : texte libre)
  permis: z.string().max(20).nullish(), // C|B|AUTRE (non-Suisses uniquement)
  fatca: z.boolean().nullish(), // lien fiscal USA (non-Suisses uniquement)
  residenceFuture: z.enum(['HABITE_LE_BIEN', 'AUTRE_ADRESSE']).nullish(),
  anneeNaissance: annee.nullish(), // 🛡 donnée protégée
  email: z.string().max(200).nullish(), // contact — envoi de l'offre par email
  // Questions-portes (« Non » persisté)
  aRevenu: z.boolean().nullish(),
  aAvoirs: z.boolean().nullish(),
  aCharges: z.boolean().nullish(),
  aPoursuites: z.boolean().nullish(),
  revenus: z.array(revenuSchema).default([]),
  charges: z.array(chargeSchema).default([]),
  avoirs: z.array(avoirSchema).default([]),
  poursuites: z.array(poursuiteSchema).default([]),
  // héritage (le closer peut compléter côté admin, plus demandé côté client)
  prenom: z.string().max(80).nullish(),
  nom: z.string().max(80).nullish(),
  etatCivil: z.string().max(40).nullish(),
  statutActivite: z.enum(['SALARIE', 'INDEPENDANT', 'RETRAITE', 'SANS_ACTIVITE']).nullish(),
  dureeActiviteRestanteMois: z.number().int().min(0).max(600).nullish(),
  employeur: z.string().max(160).nullish(),
})

// §1.6 autres biens — mini-formulaire répétable complet
export const autreBienSchema = z.object({
  usage: z.enum(['OCCUPE', 'VACANCES', 'LOUE', 'PARTIEL']).nullish(),
  locatifUsage: z.enum(['RESIDENTIEL', 'MIXTE', 'COMMERCIAL']).nullish(),
  enSuisse: z.boolean().nullish(),
  genre: z
    .enum(['MAISON', 'APPARTEMENT', 'MITOYENNE', 'IMMEUBLE', 'PLUSIEURS_APPARTEMENTS'])
    .nullish(),
  annexe: z.boolean().nullish(),
  valeur: montant.nullish(),
  aHypotheque: z.boolean().nullish(),
  hypothequeRestante: montant.nullish(),
  amortissementRequis: z.boolean().nullish(),
  amortissementAnnuel: montant.nullish(),
  revenuLocatifAnnuel: montant.nullish(),
  type: z.string().max(60).nullish(), // héritage
})

export const dossierDataSchema = z.object({
  bien: bienSchema.default({}),
  tranchesExistantes: z.array(trancheExistanteSchema).default([]),
  autresPrets: z.array(autrePretSchema).default([]),
  ajustement: ajustementSchema.default({}),
  montantTotal: montant.nullish(), // dénormalisé : voir deriveMontantTotal()
  tranchesSouhaitees: z.array(trancheSouhaiteeSchema).default([]),
  dateDebut: isoDate.nullish(), // héritage (désormais porté par chaque tranche)
  emprunteurs: z.array(emprunteurSchema).default([]),
  autresBiens: z.array(autreBienSchema).default([]),
  // Questions-portes globales (« Non » persisté)
  asks: z
    .object({
      autresPrets: z.boolean().nullish(),
      autresBiens: z.boolean().nullish(),
      plusieursEmprunteurs: z.boolean().nullish(),
    })
    .default({}),
})

export type DossierData = z.infer<typeof dossierDataSchema>
export type BienData = z.infer<typeof bienSchema>
export type EmprunteurData = z.infer<typeof emprunteurSchema>
export type AutreBienData = z.infer<typeof autreBienSchema>

/** Montant total emprunté, dérivé selon le funnel (source unique).
    Renouvellement : somme des tranches existantes ± ajustement.
    Achat : prix d'achat − fonds propres (slider du configurateur). */
export function deriveMontantTotal(funnel: Funnel, data: DossierData): number | null {
  if (funnel === 'ACHAT') {
    if (data.bien.prixAchat != null && data.bien.fondsPropres != null) {
      return Math.max(0, data.bien.prixAchat - data.bien.fondsPropres)
    }
    return data.montantTotal ?? null
  }
  if (data.tranchesExistantes.length > 0) {
    const base = data.tranchesExistantes.reduce((s, t) => s + t.montant, 0)
    const delta =
      data.ajustement.sens === 'REDUIRE'
        ? -(data.ajustement.montant ?? 0)
        : data.ajustement.sens === 'AUGMENTER'
          ? (data.ajustement.montant ?? 0)
          : 0
    return Math.max(0, base + delta)
  }
  return data.montantTotal ?? null
}

/** Invariant tranches : la somme des tranches souhaitées doit égaler le total. */
export function validateTranches(
  data: DossierData,
  funnel: Funnel = 'RENOUVELLEMENT_CHAUD'
): { ok: boolean; ecart: number } {
  const total = deriveMontantTotal(funnel, data)
  if (data.tranchesSouhaitees.length === 0 || total == null) {
    return { ok: true, ecart: 0 }
  }
  const somme = data.tranchesSouhaitees.reduce((s, t) => s + t.montant, 0)
  return { ok: Math.abs(somme - total) < 1, ecart: somme - total }
}

/** Cas non standard → tag complex (ne bloque jamais, route vers un conseiller). */
export function detectComplexReasons(data: DossierData): string[] {
  const reasons: string[] = []
  const b = data.bien
  if (b.droitHabitation) reasons.push('droit-habitation')
  if (b.usufruit) reasons.push('usufruit')
  if (b.droitSuperficie) reasons.push('droit-superficie')
  if (b.zoneAgricole) reasons.push('zone-agricole')
  if (b.servitudes) reasons.push('servitudes') // héritage
  // Nouvelle construction → crédit de construction, contact direct (note §1.1)
  if (b.bienExistant === false || b.nouvelleConstruction) reasons.push('nouvelle-construction')
  for (const emprunteur of data.emprunteurs) {
    if (emprunteur.poursuites.some((p) => !p.soldee)) {
      reasons.push('poursuite-non-soldee')
      break
    }
  }
  return reasons
}

/** Échéance la plus proche des tranches existantes (tri admin + routage funnel). */
export function echeanceProche(data: DossierData): Date | null {
  const dates = data.tranchesExistantes
    .map((t) => t.echeance)
    .filter((e): e is string => Boolean(e))
    .map((e) => new Date(e))
    .sort((a, b) => a.getTime() - b.getTime())
  return dates[0] ?? null
}

/** Somme des revenus annuels d'un dossier (tenue des charges, calibration). */
export function totalRevenus(data: DossierData): number {
  return data.emprunteurs.reduce(
    (s, e) => s + e.revenus.reduce((x, r) => x + r.montantAnnuel, 0),
    0
  )
}
