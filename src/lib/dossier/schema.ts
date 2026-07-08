import { z } from 'zod'

// ─── DossierData : le format canonique du snapshot JSON ────────────────
// C'est CE format qui est figé dans DossierVersion.data (vérité immuable)
// et projeté dans les tables structurées (état courant). Tout est optionnel :
// le wizard sauvegarde à chaque étape, la complétude se mesure à part.
// ⚠️ L'inventaire exact des champs sera calé sur docs/formulaire-complet.md.

const montant = z.number().min(0).max(100_000_000)
const annee = z
  .number()
  .int()
  .min(1850)
  .max(new Date().getFullYear() + 3)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const bienSchema = z.object({
  usage: z.enum(['RESIDENCE_PRINCIPALE', 'RESIDENCE_SECONDAIRE', 'RENDEMENT']).nullish(),
  type: z.enum(['MAISON', 'APPARTEMENT_PPE', 'MAISON_MITOYENNE', 'IMMEUBLE']).nullish(),
  position: z.enum(['INDIVIDUELLE', 'JUMELEE', 'MITOYENNE_CENTRALE', 'MITOYENNE_ANGLE']).nullish(),
  rue: z.string().max(200).nullish(),
  npa: z.string().max(10).nullish(),
  localite: z.string().max(100).nullish(),
  canton: z.string().max(2).nullish(),
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
  chauffage: z.string().max(60).nullish(),
  labelEco: z.string().max(60).nullish(),
  etatCuisine: z.number().int().min(1).max(7).nullish(),
  etatSallesBains: z.number().int().min(1).max(7).nullish(),
  etatInterieur: z.number().int().min(1).max(7).nullish(),
  etatExterieur: z.number().int().min(1).max(7).nullish(),
  servitudes: z.boolean().nullish(),
  zoneAgricole: z.boolean().nullish(),
  nouvelleConstruction: z.boolean().nullish(),
  valeur: montant.nullish(),
  prixAchat: montant.nullish(),
  fondsPropres: montant.nullish(),
})

export const trancheExistanteSchema = z.object({
  lenderId: z.string().nullish(),
  lenderNom: z.string().max(160).nullish(),
  montant: montant,
  taux: z.number().min(0).max(15).nullish(),
  produit: z.enum(['FIXE', 'SARON', 'VARIABLE']).default('FIXE'),
  echeance: isoDate.nullish(),
})

export const trancheSouhaiteeSchema = z.object({
  produit: z.enum(['FIXE', 'SARON']).default('FIXE'),
  dureeAnnees: z.number().int().min(1).max(25).nullish(),
  montant: montant,
})

export const revenuSchema = z.object({
  type: z.enum(['SALAIRE', 'BONUS', 'INDEPENDANT', 'RENTE', 'REVENU_LOCATIF', 'AUTRE']),
  montantAnnuel: montant,
  libelle: z.string().max(120).nullish(),
})

export const chargeSchema = z.object({
  type: z.enum(['LEASING', 'CREDIT', 'PENSION_ALIMENTAIRE', 'AUTRE']),
  montantAnnuel: montant,
  echeanceLeasing: isoDate.nullish(),
})

export const avoirSchema = z.object({
  type: z.enum([
    'COMPTE_EPARGNE',
    'TITRES',
    'PILIER_3A',
    'LIBRE_PASSAGE',
    'CAPITAL_LPP',
    'DONATION',
    'AUTRE',
  ]),
  montant: montant,
  utilisePourAchat: z.boolean().default(false),
})

export const poursuiteSchema = z.object({
  soldee: z.boolean(),
  montant: montant.nullish(),
  motif: z.string().max(300).nullish(),
})

export const emprunteurSchema = z.object({
  ordre: z.number().int().min(1).max(4),
  prenom: z.string().max(80).nullish(),
  nom: z.string().max(80).nullish(),
  anneeNaissance: annee.nullish(),
  etatCivil: z.string().max(40).nullish(),
  nationalite: z.string().max(60).nullish(),
  permis: z.string().max(20).nullish(),
  statutActivite: z.enum(['SALARIE', 'INDEPENDANT', 'RETRAITE', 'SANS_ACTIVITE']).nullish(),
  dureeActiviteRestanteMois: z.number().int().min(0).max(600).nullish(),
  employeur: z.string().max(160).nullish(),
  revenus: z.array(revenuSchema).default([]),
  charges: z.array(chargeSchema).default([]),
  avoirs: z.array(avoirSchema).default([]),
  poursuites: z.array(poursuiteSchema).default([]),
})

export const autreBienSchema = z.object({
  type: z.string().max(60).nullish(),
  valeur: montant.nullish(),
  hypothequeRestante: montant.nullish(),
  revenuLocatifAnnuel: montant.nullish(),
})

export const dossierDataSchema = z.object({
  bien: bienSchema.default({}),
  tranchesExistantes: z.array(trancheExistanteSchema).default([]),
  montantTotal: montant.nullish(),
  tranchesSouhaitees: z.array(trancheSouhaiteeSchema).default([]),
  dateDebut: isoDate.nullish(),
  emprunteurs: z.array(emprunteurSchema).default([]),
  autresBiens: z.array(autreBienSchema).default([]),
})

export type DossierData = z.infer<typeof dossierDataSchema>
export type BienData = z.infer<typeof bienSchema>
export type EmprunteurData = z.infer<typeof emprunteurSchema>

/** Invariant tranches : la somme des tranches souhaitées doit égaler le total. */
export function validateTranches(data: DossierData): { ok: boolean; ecart: number } {
  if (data.tranchesSouhaitees.length === 0 || data.montantTotal == null) {
    return { ok: true, ecart: 0 }
  }
  const somme = data.tranchesSouhaitees.reduce((s, t) => s + t.montant, 0)
  return { ok: Math.abs(somme - data.montantTotal) < 1, ecart: somme - data.montantTotal }
}

/** Cas non standard → tag complex (ne bloque jamais, route vers un conseiller). */
export function detectComplexReasons(data: DossierData): string[] {
  const reasons: string[] = []
  if (data.bien.servitudes) reasons.push('servitudes')
  if (data.bien.zoneAgricole) reasons.push('zone-agricole')
  if (data.bien.nouvelleConstruction) reasons.push('nouvelle-construction')
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
