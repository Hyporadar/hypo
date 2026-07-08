// ─── Diff entre deux versions de dossier ───────────────────────────────
// Aplatissement clé/valeur du JSON + libellés humains (français — panel
// interne). Utilisé par la vue « Comparer » de l'admin.

export interface DiffEntry {
  path: string
  label: string
  before: string
  after: string
}

// Libellés humains des chemins — les segments non listés restent bruts.
const SEGMENT_LABELS: Record<string, string> = {
  bien: 'Bien',
  usage: 'Usage',
  type: 'Type',
  position: 'Position',
  rue: 'Rue',
  npa: 'NPA',
  localite: 'Localité',
  canton: 'Canton',
  geoConfirme: 'Adresse confirmée',
  anneeConstruction: 'Année de construction',
  anneeRenovation: 'Année de rénovation',
  pieces: 'Pièces',
  sallesEau: "Salles d'eau",
  baignoires: 'Baignoires',
  douches: 'Douches',
  wc: 'WC',
  surfaceHabitable: 'Surface habitable',
  chauffage: 'Chauffage',
  labelEco: 'Label éco',
  etatCuisine: 'État cuisine',
  etatSallesBains: 'État salles de bains',
  etatInterieur: 'État intérieur',
  etatExterieur: 'État extérieur',
  servitudes: 'Servitudes',
  zoneAgricole: 'Zone agricole',
  nouvelleConstruction: 'Nouvelle construction',
  valeur: 'Valeur du bien',
  prixAchat: "Prix d'achat",
  fondsPropres: 'Fonds propres',
  tranchesExistantes: 'Hypothèque existante',
  tranchesSouhaitees: 'Tranche souhaitée',
  lenderNom: 'Prêteur',
  montant: 'Montant',
  taux: 'Taux',
  produit: 'Produit',
  echeance: 'Échéance',
  dureeAnnees: 'Durée (ans)',
  montantTotal: 'Montant total',
  dateDebut: 'Date de début',
  emprunteurs: 'Emprunteur',
  prenom: 'Prénom',
  nom: 'Nom',
  anneeNaissance: 'Année de naissance',
  etatCivil: 'État civil',
  nationalite: 'Nationalité',
  permis: 'Permis',
  statutActivite: 'Activité',
  dureeActiviteRestanteMois: "Durée restante d'activité (mois)",
  employeur: 'Employeur',
  revenus: 'Revenu',
  charges: 'Charge',
  avoirs: 'Avoir',
  poursuites: 'Poursuite',
  montantAnnuel: 'Montant annuel',
  libelle: 'Libellé',
  echeanceLeasing: 'Échéance du leasing',
  utilisePourAchat: "Utilisé pour l'achat",
  soldee: 'Soldée',
  motif: 'Motif',
  autresBiens: 'Autre bien',
  hypothequeRestante: 'Hypothèque restante',
  revenuLocatifAnnuel: 'Revenu locatif annuel',
  // v2 — formulaire-complet.md
  vacancesOccupation: 'Occupation (vacances)',
  locatifUsage: 'Usage locatif',
  locatifTypeLocation: 'Type de location',
  annexe: 'Appartement annexe',
  annexeLouee: 'Annexe louée',
  revenuAnnexeAnnuel: "Revenu de l'annexe",
  droitHabitation: "Droit d'habitation",
  usufruit: 'Usufruit',
  droitSuperficie: 'Droit de superficie',
  bienExistant: 'Bien existant',
  dateAchatFixee: "Date d'achat fixée",
  dateAchat: "Date d'achat",
  renovationImmediate: 'Rénovation immédiate',
  valeurSource: "Source de l'estimation",
  autresPrets: 'Autre prêt',
  ajustement: 'Ajustement',
  sens: 'Sens',
  raison: 'Raison',
  fatca: 'Lien fiscal USA',
  residenceFuture: 'Résidence future',
  aRevenu: 'A un revenu',
  aAvoirs: 'A des avoirs',
  aCharges: 'A des charges',
  aPoursuites: 'A des poursuites',
  categorie: 'Catégorie',
  typeActivite: "Type d'activité",
  typeRente: 'Type de rente',
  typeAutre: 'Type (autre revenu)',
  bonus3Ans: 'Bonus (3 dernières années)',
  bonusMontants: 'Bonus',
  independantPlus3Ans: 'Indépendant depuis plus de 3 ans',
  independantDepuisMois: 'Indépendant depuis (mois)',
  typeBancaire: 'Type bancaire',
  leasingFinAnnee: 'Fin du leasing (année)',
  origine: 'Origine de la poursuite',
  enSuisse: 'Situé en Suisse',
  genre: "Genre d'objet",
  aHypotheque: 'Hypothèques sur ce bien',
  amortissementRequis: 'Amortissement requis',
  amortissementAnnuel: 'Amortissement annuel',
  asks: 'Réponses',
  plusieursEmprunteurs: 'Plusieurs emprunteurs',
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Aplatit le JSON en chemins pointés ; les index de tableau deviennent « #n ». */
export function flattenDossier(value: unknown, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (isPlainObject(value)) {
    for (const [key, v] of Object.entries(value)) {
      Object.assign(out, flattenDossier(v, prefix ? `${prefix}.${key}` : key))
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => {
      Object.assign(out, flattenDossier(v, `${prefix}#${i + 1}`))
    })
    if (value.length === 0) out[prefix] = undefined
  } else {
    out[prefix] = value
  }
  return out
}

export function humanLabel(path: string): string {
  return path
    .split('.')
    .map((segment) => {
      const match = segment.match(/^(.+?)#(\d+)$/)
      if (match) {
        const base = SEGMENT_LABELS[match[1]!] ?? match[1]!
        return `${base} ${match[2]}`
      }
      return SEGMENT_LABELS[segment] ?? segment
    })
    .join(' · ')
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  return String(value)
}

/** Diff clé/valeur entre deux snapshots — uniquement les champs modifiés. */
export function diffVersions(before: unknown, after: unknown): DiffEntry[] {
  const flatBefore = flattenDossier(before)
  const flatAfter = flattenDossier(after)
  const paths = [...new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)])].sort()

  const entries: DiffEntry[] = []
  for (const path of paths) {
    const b = flatBefore[path]
    const a = flatAfter[path]
    const bothEmpty = (b === null || b === undefined) && (a === null || a === undefined)
    if (bothEmpty || String(b) === String(a)) continue
    entries.push({ path, label: humanLabel(path), before: display(b), after: display(a) })
  }
  return entries
}
