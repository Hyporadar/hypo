import type { Funnel } from '@prisma/client'
import type { DossierData } from '@/lib/dossier/schema'

// ─── Complétude du dossier — source unique ─────────────────────────────
// Utilisée par le wizard (MissingInfoBadge, jauge assistant) ET par
// l'admin (jauge + « quoi demander au téléphone »). Un item = une question.

export type DossierSection = 'bien' | 'emprunteurs' | 'hypotheque'

export interface RequirementItem {
  key: string // identifiant stable = clé i18n wizard.questions.<key>
  section: DossierSection
  done: boolean
}

export interface Completeness {
  percent: number
  total: number
  answered: number
  missing: RequirementItem[]
  missingBySection: Record<DossierSection, RequirementItem[]>
}

function has(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** Liste des exigences selon le funnel — l'ordre suit l'arbre du wizard. */
export function requirements(funnel: Funnel, data: DossierData): RequirementItem[] {
  const b = data.bien
  const items: RequirementItem[] = [
    { key: 'usage', section: 'bien', done: has(b.usage) },
    { key: 'typeBien', section: 'bien', done: has(b.type) },
    { key: 'adresse', section: 'bien', done: has(b.npa) && has(b.localite) },
    { key: 'anneeConstruction', section: 'bien', done: has(b.anneeConstruction) },
    { key: 'pieces', section: 'bien', done: has(b.pieces) },
    { key: 'sallesEau', section: 'bien', done: has(b.sallesEau) },
    {
      key: 'etatBien',
      section: 'bien',
      done:
        has(b.etatCuisine) &&
        has(b.etatSallesBains) &&
        has(b.etatInterieur) &&
        has(b.etatExterieur),
    },
    { key: 'chauffage', section: 'bien', done: has(b.chauffage) },
    {
      key: 'casSpeciaux',
      section: 'bien',
      done: b.servitudes != null && b.zoneAgricole != null && b.nouvelleConstruction != null,
    },
    { key: 'valeur', section: 'bien', done: has(b.valeur) },
  ]

  // Position uniquement pour les maisons.
  if (b.type === 'MAISON' || b.type === 'MAISON_MITOYENNE') {
    items.splice(2, 0, { key: 'position', section: 'bien', done: has(b.position) })
  }

  if (funnel === 'ACHAT') {
    items.push(
      { key: 'prixAchat', section: 'bien', done: has(b.prixAchat) },
      { key: 'fondsPropres', section: 'bien', done: has(b.fondsPropres) }
    )
  } else {
    items.push({
      key: 'tranchesExistantes',
      section: 'bien',
      done:
        data.tranchesExistantes.length > 0 &&
        data.tranchesExistantes.every((t) => has(t.montant) && has(t.echeance)),
    })
  }

  // Emprunteurs : au moins un, et pour chacun les blocs clés.
  if (data.emprunteurs.length === 0) {
    items.push(
      { key: 'emprunteurIdentite', section: 'emprunteurs', done: false },
      { key: 'emprunteurActivite', section: 'emprunteurs', done: false },
      { key: 'emprunteurRevenus', section: 'emprunteurs', done: false },
      { key: 'emprunteurAvoirs', section: 'emprunteurs', done: false },
      { key: 'emprunteurPoursuites', section: 'emprunteurs', done: false }
    )
  } else {
    for (const e of data.emprunteurs) {
      const suffix = data.emprunteurs.length > 1 ? `#${e.ordre}` : ''
      items.push(
        {
          key: `emprunteurIdentite${suffix}`,
          section: 'emprunteurs',
          done: has(e.anneeNaissance) && has(e.etatCivil),
        },
        { key: `emprunteurActivite${suffix}`, section: 'emprunteurs', done: has(e.statutActivite) },
        { key: `emprunteurRevenus${suffix}`, section: 'emprunteurs', done: e.revenus.length > 0 },
        { key: `emprunteurAvoirs${suffix}`, section: 'emprunteurs', done: e.avoirs.length > 0 },
        {
          key: `emprunteurPoursuites${suffix}`,
          section: 'emprunteurs',
          done: e.poursuites.length > 0 || e.statutActivite != null, // « non » = tableau vide déclaré après activité
        }
      )
    }
  }

  items.push(
    { key: 'montantTotal', section: 'hypotheque', done: has(data.montantTotal) },
    {
      key: 'tranchesSouhaitees',
      section: 'hypotheque',
      done: data.tranchesSouhaitees.length > 0,
    },
    { key: 'dateDebut', section: 'hypotheque', done: has(data.dateDebut) }
  )

  return items
}

export function computeCompleteness(funnel: Funnel, data: DossierData): Completeness {
  const items = requirements(funnel, data)
  const answered = items.filter((i) => i.done).length
  const missing = items.filter((i) => !i.done)
  const missingBySection: Record<DossierSection, RequirementItem[]> = {
    bien: [],
    emprunteurs: [],
    hypotheque: [],
  }
  for (const item of missing) missingBySection[item.section].push(item)

  return {
    percent: items.length === 0 ? 0 : Math.round((answered / items.length) * 100),
    total: items.length,
    answered,
    missing,
    missingBySection,
  }
}
