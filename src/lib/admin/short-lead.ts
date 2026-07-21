import { computeAffordability, type AffordabilityState } from '@/lib/dossier/affordability'

// Extraction des chiffres d'un lead du formulaire court (TestLead.data =
// snapshot DossierData) pour l'affichage admin.

export interface ShortLeadFigures {
  valeur: number | null
  montant: number | null
  revenu: number | null
  npa: string | null
  localite: string | null
  ltv: number
  charges: number
  state: AffordabilityState
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
}

export function shortLeadFigures(data: unknown): ShortLeadFigures {
  const d = (data ?? {}) as {
    montantTotal?: unknown
    bien?: { valeur?: unknown; prixAchat?: unknown; npa?: unknown; localite?: unknown }
    emprunteurs?: Array<{ revenus?: Array<{ montantAnnuel?: unknown }> }>
  }
  const valeur = num(d.bien?.valeur) ?? num(d.bien?.prixAchat)
  const montant = num(d.montantTotal)
  const npa = str(d.bien?.npa)
  const localite = str(d.bien?.localite)
  let revenu = 0
  for (const e of Array.isArray(d.emprunteurs) ? d.emprunteurs : []) {
    for (const r of Array.isArray(e?.revenus) ? e.revenus : []) {
      revenu += num(r?.montantAnnuel) ?? 0
    }
  }
  const aff = computeAffordability(montant ?? 0, valeur ?? 0, revenu)
  return {
    valeur,
    montant,
    revenu: revenu > 0 ? revenu : null,
    npa,
    localite,
    ltv: aff.ltv,
    charges: aff.charges,
    state: aff.state,
  }
}

export const ECHEANCE_LABELS: Record<string, string> = {
  lt6: '< 6 mois',
  mid: '6-18 mois',
  gt18: '> 18 mois',
  unknown: 'Ne sait pas',
}

export const STATE_LABELS: Record<AffordabilityState, string> = {
  incomplete: 'Incomplet',
  standard: 'Standard',
  borderline: 'Limite',
  nonfundable: 'Non finançable',
}

// Variante de Badge shadcn par état (couleur sémantique).
export const STATE_BADGE: Record<AffordabilityState, 'secondary' | 'default' | 'outline'> = {
  incomplete: 'outline',
  standard: 'default',
  borderline: 'secondary',
  nonfundable: 'outline',
}

export const SLOT_LABELS: Record<string, string> = {
  matin: 'Matin (9h–12h)',
  'apres-midi': 'Après-midi (12h–17h)',
  soir: 'Soir (17h–20h)',
  ALERTE_TAUX: 'Alerte taux',
  SURVEILLANCE: 'Surveillance échéance',
}
