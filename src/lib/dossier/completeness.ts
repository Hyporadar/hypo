import type { Funnel } from '@prisma/client'
import { deriveMontantTotal, validateTranches, type DossierData } from '@/lib/dossier/schema'

// ─── Complétude du dossier — source unique ─────────────────────────────
// Utilisée par le wizard (MissingInfoBadge, jauge assistant) ET par
// l'admin (jauge + « quoi demander au téléphone »). Un item = une question
// de docs/formulaire-complet.md (qui fait foi).

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

  // §1.1 usage + branches locatives
  const usageDone =
    has(b.usage) &&
    (b.usage !== 'VACANCES' || has(b.vacancesOccupation)) &&
    (b.usage !== 'RENDEMENT' ||
      (has(b.locatifUsage) && has(b.locatifTypeLocation) && has(b.revenuLocatifAnnuel)))

  // Type + appartement annexe (maison individuelle)
  const annexeDone =
    b.type !== 'MAISON' ||
    (b.annexe != null &&
      (!b.annexe || (b.annexeLouee != null && (!b.annexeLouee || has(b.revenuAnnexeAnnuel)))))
  const typeDone = has(b.type) && annexeDone

  // §1.1 cas spéciaux : 4 × Non/Oui
  const casSpeciauxDone =
    b.droitHabitation != null &&
    b.usufruit != null &&
    b.droitSuperficie != null &&
    b.zoneAgricole != null

  const items: RequirementItem[] = [
    { key: 'usage', section: 'bien', done: usageDone },
    { key: 'typeBien', section: 'bien', done: typeDone },
    { key: 'adresse', section: 'bien', done: has(b.npa) && has(b.localite) },
    { key: 'labelEco', section: 'bien', done: has(b.labelEco) },
    { key: 'chauffage', section: 'bien', done: has(b.chauffage) },
    { key: 'casSpeciaux', section: 'bien', done: casSpeciauxDone },
  ]

  if (funnel === 'ACHAT') {
    // §1.2 informations sur l'achat
    items.push({
      key: 'achatInfos',
      section: 'bien',
      done:
        b.bienExistant != null &&
        has(b.prixAchat) &&
        b.dateAchatFixee != null &&
        (!b.dateAchatFixee || has(b.dateAchat)) &&
        b.renovationImmediate != null,
    })
  }

  // §1.3 valeur + source de l'estimation
  items.push({
    key: 'valeur',
    section: 'bien',
    done: has(b.valeur) && has(b.valeurSource),
  })

  if (funnel === 'ACHAT') {
    // §1.5 autres prêts liés au bien
    items.push({
      key: 'autresPrets',
      section: 'bien',
      done:
        data.asks.autresPrets != null && (!data.asks.autresPrets || data.autresPrets.length > 0),
    })
  } else {
    // §1.4 hypothèques existantes (multi-tranches)
    items.push({
      key: 'tranchesExistantes',
      section: 'bien',
      done:
        data.tranchesExistantes.length > 0 &&
        data.tranchesExistantes.every((t) => has(t.montant) && has(t.echeance)),
    })
  }

  // §1.6 autres biens en propriété
  items.push({
    key: 'autresBiens',
    section: 'bien',
    done:
      data.asks.autresBiens != null &&
      (!data.asks.autresBiens ||
        (data.autresBiens.length > 0 &&
          data.autresBiens.every((ab) => has(ab.usage) && has(ab.genre) && has(ab.valeur)))),
  })

  // §2.0 « Qui sera emprunteur ? »
  items.push({
    key: 'nombreEmprunteurs',
    section: 'emprunteurs',
    done: data.asks.plusieursEmprunteurs != null,
  })

  // §2.1–2.5 par personne
  if (data.emprunteurs.length === 0) {
    items.push(
      { key: 'emprunteurIdentite', section: 'emprunteurs', done: false },
      { key: 'emprunteurRevenus', section: 'emprunteurs', done: false },
      { key: 'emprunteurAvoirs', section: 'emprunteurs', done: false },
      { key: 'emprunteurCharges', section: 'emprunteurs', done: false },
      { key: 'emprunteurPoursuites', section: 'emprunteurs', done: false }
    )
  } else {
    for (const e of data.emprunteurs) {
      const suffix = data.emprunteurs.length > 1 ? `#${e.ordre}` : ''
      const suisse = e.nationalite === 'SUISSE' || e.nationalite === 'Suisse'
      const identiteDone =
        has(e.nationalite) &&
        (suisse || (has(e.permis) && e.fatca != null)) &&
        has(e.residenceFuture) &&
        has(e.anneeNaissance) &&
        (e.ordre !== 1 || (has(e.email) && e.email!.includes('@')))
      const revenuOk = (r: (typeof e.revenus)[number]) =>
        r.montantAnnuel > 0 &&
        (has(r.categorie) || has(r.type)) &&
        (r.categorie !== 'ACTIVITE' || has(r.typeActivite)) &&
        (r.categorie !== 'RENTE' || has(r.typeRente)) &&
        (r.categorie !== 'AUTRE' || has(r.typeAutre))
      items.push(
        { key: `emprunteurIdentite${suffix}`, section: 'emprunteurs', done: identiteDone },
        {
          key: `emprunteurRevenus${suffix}`,
          section: 'emprunteurs',
          done:
            e.aRevenu != null && (!e.aRevenu || (e.revenus.length > 0 && e.revenus.every(revenuOk))),
        },
        {
          key: `emprunteurAvoirs${suffix}`,
          section: 'emprunteurs',
          done: e.aAvoirs != null && (!e.aAvoirs || e.avoirs.length > 0),
        },
        {
          key: `emprunteurCharges${suffix}`,
          section: 'emprunteurs',
          done: e.aCharges != null && (!e.aCharges || e.charges.length > 0),
        },
        {
          key: `emprunteurPoursuites${suffix}`,
          section: 'emprunteurs',
          done:
            e.aPoursuites != null &&
            (!e.aPoursuites ||
              (e.poursuites.length > 0 && e.poursuites.every((p) => has(p.origine)))),
        }
      )
    }
  }

  // §3 configurateur
  const total = deriveMontantTotal(funnel, data)
  if (funnel !== 'ACHAT') {
    items.push({
      key: 'ajustement',
      section: 'hypotheque',
      done:
        data.ajustement.sens != null &&
        (data.ajustement.sens === 'AUCUN' || has(data.ajustement.montant)) &&
        (data.ajustement.sens !== 'AUGMENTER' || has(data.ajustement.raison)),
    })
  } else {
    items.push({
      key: 'fondsPropres',
      section: 'hypotheque',
      done: has(data.bien.fondsPropres),
    })
  }
  items.push({
    key: 'tranchesSouhaitees',
    section: 'hypotheque',
    done:
      total != null &&
      data.tranchesSouhaitees.length > 0 &&
      validateTranches(data, funnel).ok &&
      data.tranchesSouhaitees.every((t) => t.produit !== 'FIXE' || has(t.dureeAnnees)),
  })

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
