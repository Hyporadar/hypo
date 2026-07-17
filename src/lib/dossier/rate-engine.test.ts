import { describe, expect, it } from 'vitest'
import { estimateRate, type Duration, type RateProfile } from '@/lib/dossier/rate-engine'

// Profil standard (LTV 60 %, charges ~20 %) — n'entraîne aucun cas non standard.
const PROFILE: RateProfile = {
  montant: 600_000,
  valeur: 1_000_000,
  revenusBrutsAnnuels: 200_000,
  amortissementAnnuel: 0,
  usage: 'principal',
  forward: false,
}

function lowest(duration: Duration) {
  const r = estimateRate(PROFILE, duration)
  if (r.nonStandard) throw new Error('profil censé être standard')
  // Trié par borne basse croissante → le premier est le moins cher.
  return { first: r.lenders[0]!.type, lenders: r.lenders }
}

describe('estimateRate — flip de l’ordre des prêteurs selon la durée', () => {
  it('SARON et 5 ans : les Banques ont la borne basse la plus basse', () => {
    expect(lowest('saron').first).toBe('BANQUE')
    expect(lowest('y5').first).toBe('BANQUE')
  })

  it('10 et 15 ans : les Assurances ont la borne basse la plus basse', () => {
    expect(lowest('y10').first).toBe('ASSURANCE')
    expect(lowest('y15').first).toBe('ASSURANCE')
  })

  it('les fourchettes sont triées par borne basse croissante (le moins cher en haut)', () => {
    for (const d of ['saron', 'y5', 'y10', 'y15'] as Duration[]) {
      const { lenders } = lowest(d)
      for (let i = 1; i < lenders.length; i++) {
        expect(lenders[i]!.min).toBeGreaterThanOrEqual(lenders[i - 1]!.min)
      }
    }
  })

  it('largeurs différenciées : Banques les plus larges, Assurances les plus étroites', () => {
    const r = estimateRate(PROFILE, 'y10')
    if (r.nonStandard) throw new Error('profil censé être standard')
    const width = (t: string) => {
      const l = r.lenders.find((x) => x.type === t)!
      return Math.round((l.max - l.min) * 100) / 100
    }
    // Largeurs de conception 0,28 / 0,20 / 0,15, affichées après arrondi à 0,05.
    expect(width('BANQUE')).toBeGreaterThan(width('CAISSE_PENSION'))
    expect(width('CAISSE_PENSION')).toBeGreaterThan(width('ASSURANCE'))
    expect(width('CAISSE_PENSION')).toBe(0.2)
    expect(width('ASSURANCE')).toBe(0.15)
  })

  it('« dès X% » = minimum des trois bornes basses', () => {
    const r = estimateRate(PROFILE, 'y10')
    if (r.nonStandard) throw new Error('profil censé être standard')
    expect(r.from).toBe(Math.min(...r.lenders.map((l) => l.min)))
  })
})
