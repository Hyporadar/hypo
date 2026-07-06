import { describe, expect, it } from 'vitest'
import {
  classifyRenewal,
  computeAffordability,
  computeLeadScore,
  computeRenewalSavings,
  estimateMonthlyPayment,
  maxAffordablePrice,
  monthsUntil,
  rateRange,
  renewalFunnel,
  wakeUpDate,
} from '@/lib/finance'
import { formatCHF, formatDate, formatRate } from '@/lib/format'

describe('computeAffordability — tenue des charges', () => {
  // Cas réel du brief : bien à 1'000'000, revenu 180'000, fonds propres 200'000.
  // Prêt 800'000 → intérêts 40'000 + amortissement 10'000 + entretien 10'000 = 60'000.
  // 60'000 / 180'000 = 33,33% > 33% → NON finançable, de justesse.
  it('refuse le cas du brief (ratio 33,33% > 33%)', () => {
    const r = computeAffordability({
      price: 1_000_000,
      annualGrossIncome: 180_000,
      ownFunds: 200_000,
      ownFundsPillar2: 0,
    })
    expect(r.loanAmount).toBe(800_000)
    expect(r.annualInterest).toBe(40_000)
    expect(r.annualAmortization).toBeCloseTo(10_000, 5) // (800k − 650k) / 15
    expect(r.annualMaintenance).toBe(10_000)
    expect(r.annualCosts).toBeCloseTo(60_000, 5)
    expect(r.chargeRatio).toBeCloseTo(1 / 3, 5)
    expect(r.meetsCharge).toBe(false)
    expect(r.meetsOwnFunds).toBe(true) // 200k = 20% exactement
    expect(r.meetsHardOwnFunds).toBe(true)
    expect(r.feasible).toBe(false)
  })

  it('accepte le même bien avec un revenu de 185 000 (ratio 32,4%)', () => {
    const r = computeAffordability({
      price: 1_000_000,
      annualGrossIncome: 185_000,
      ownFunds: 200_000,
      ownFundsPillar2: 0,
    })
    expect(r.meetsCharge).toBe(true)
    expect(r.feasible).toBe(true)
  })

  it("n'exige aucun amortissement si le prêt est déjà ≤ 65% du bien", () => {
    const r = computeAffordability({
      price: 1_000_000,
      annualGrossIncome: 130_000,
      ownFunds: 400_000,
      ownFundsPillar2: 0,
    })
    expect(r.loanAmount).toBe(600_000)
    expect(r.annualAmortization).toBe(0)
    expect(r.annualCosts).toBe(40_000) // 30k intérêts + 10k entretien
    expect(r.feasible).toBe(true)
  })
})

describe('computeAffordability — fonds propres', () => {
  it('refuse en dessous de 20% de fonds propres', () => {
    const r = computeAffordability({
      price: 1_000_000,
      annualGrossIncome: 300_000,
      ownFunds: 150_000,
      ownFundsPillar2: 0,
    })
    expect(r.meetsOwnFunds).toBe(false)
    expect(r.feasible).toBe(false)
  })

  it('refuse si moins de 10% hors 2e pilier', () => {
    const r = computeAffordability({
      price: 1_000_000,
      annualGrossIncome: 300_000,
      ownFunds: 200_000,
      ownFundsPillar2: 150_000, // fonds durs : 50'000 < 100'000
    })
    expect(r.meetsOwnFunds).toBe(true)
    expect(r.meetsHardOwnFunds).toBe(false)
    expect(r.feasible).toBe(false)
  })

  it('accepte exactement 10% hors 2e pilier', () => {
    const r = computeAffordability({
      price: 1_000_000,
      annualGrossIncome: 200_000,
      ownFunds: 200_000,
      ownFundsPillar2: 100_000,
    })
    expect(r.meetsHardOwnFunds).toBe(true)
  })
})

describe('maxAffordablePrice', () => {
  it('est cohérent : finançable au max, plus au-delà', () => {
    const income = 180_000
    const ownFunds = 200_000
    const max = maxAffordablePrice(income, ownFunds, 0)

    const atMax = computeAffordability({
      price: max,
      annualGrossIncome: income,
      ownFunds,
      ownFundsPillar2: 0,
    })
    expect(atMax.feasible).toBe(true)

    const above = computeAffordability({
      price: max + 5_000,
      annualGrossIncome: income,
      ownFunds,
      ownFundsPillar2: 0,
    })
    expect(above.feasible).toBe(false)
  })

  it('est plafonné par les fonds propres (20%)', () => {
    // Revenu confortable, peu de fonds propres : la contrainte des 20% domine.
    expect(maxAffordablePrice(500_000, 100_000, 0)).toBe(500_000)
  })

  it('est plafonné par les fonds propres durs (10%)', () => {
    // 200k de fonds propres dont 150k de 2e pilier → 50k durs → max 500'000.
    expect(maxAffordablePrice(500_000, 200_000, 150_000)).toBe(500_000)
  })
})

describe('computeRenewalSavings', () => {
  it('calcule (taux actuel − taux de référence) × montant restant', () => {
    // 500'000 à 1,85% contre référence 1,25% → 3'000 CHF/an.
    expect(
      computeRenewalSavings({ remainingAmount: 500_000, currentRate: 1.85, referenceRate: 1.25 })
    ).toBeCloseTo(3_000, 5)
  })

  it('est négatif si le client est déjà mieux que le marché', () => {
    expect(
      computeRenewalSavings({ remainingAmount: 500_000, currentRate: 1.0, referenceRate: 1.25 })
    ).toBeLessThan(0)
  })
})

describe('routage renouvellement (seuils 4 / 18 mois)', () => {
  const now = new Date('2026-07-06')

  it('monthsUntil compte les mois entiers', () => {
    expect(monthsUntil(new Date('2026-10-06'), now)).toBe(3)
    expect(monthsUntil(new Date('2026-10-05'), now)).toBe(2) // jour non atteint
    expect(monthsUntil(new Date('2028-01-06'), now)).toBe(18)
  })

  it('< 4 mois → TROP_TARD', () => {
    expect(classifyRenewal(new Date('2026-10-01'), now)).toBe('TROP_TARD')
  })

  it('exactement 4 mois → CHAUD', () => {
    expect(classifyRenewal(new Date('2026-11-06'), now)).toBe('CHAUD')
  })

  it('14 mois → CHAUD (fenêtre 12–18)', () => {
    expect(classifyRenewal(new Date('2027-09-06'), now)).toBe('CHAUD')
  })

  it('exactement 18 mois → FROID', () => {
    expect(classifyRenewal(new Date('2028-01-06'), now)).toBe('FROID')
  })

  it('30 mois → FROID', () => {
    expect(classifyRenewal(new Date('2029-01-06'), now)).toBe('FROID')
  })

  it('mappe vers les funnels Prisma (TROP_TARD rejoint le froid)', () => {
    expect(renewalFunnel(new Date('2026-08-01'), now)).toBe('RENOUVELLEMENT_FROID')
    expect(renewalFunnel(new Date('2027-06-06'), now)).toBe('RENOUVELLEMENT_CHAUD')
    expect(renewalFunnel(new Date('2030-01-01'), now)).toBe('RENOUVELLEMENT_FROID')
  })

  it('wakeUpDate = échéance − 18 mois', () => {
    expect(wakeUpDate(new Date('2028-01-15')).toISOString().slice(0, 10)).toBe('2026-07-15')
  })
})

describe('computeLeadScore — montant × urgence', () => {
  it('pondère par la classification', () => {
    expect(computeLeadScore(800_000, 'CHAUD')).toBe(1_600)
    expect(computeLeadScore(800_000, 'ACHAT')).toBe(1_200)
    expect(computeLeadScore(800_000, 'FROID')).toBe(800)
    expect(computeLeadScore(800_000, 'TROP_TARD')).toBe(400)
  })

  it('ne descend jamais sous zéro', () => {
    expect(computeLeadScore(-5_000, 'CHAUD')).toBe(0)
  })
})

describe('rateRange — fourchette indicative ± 0,15', () => {
  it('encadre le taux de référence', () => {
    expect(rateRange(1.3)).toEqual({ min: 1.15, max: 1.45 })
  })

  it('ne descend pas sous zéro', () => {
    expect(rateRange(0.1).min).toBe(0)
  })
})

describe('estimateMonthlyPayment', () => {
  it('intérêts au taux indicatif + amortissement, /12', () => {
    // prêt 800k à 1,3% sur bien 1M : 10'400 intérêts + 10'000 amort = 20'400/an → 1'700/mois
    expect(estimateMonthlyPayment(800_000, 1_000_000, 1.3)).toBeCloseTo(1_700, 5)
  })

  it('sans amortissement si prêt ≤ 65%', () => {
    expect(estimateMonthlyPayment(600_000, 1_000_000, 1.2)).toBeCloseTo(600, 5)
  })
})

describe('formats suisses', () => {
  it('montants : apostrophe pour les milliers, CHF devant', () => {
    expect(formatCHF(1_250_000)).toBe("CHF 1'250'000")
    expect(formatCHF(950)).toBe('CHF 950')
    expect(formatCHF(1234.5, 2)).toBe("CHF 1'234,50")
  })

  it('taux : virgule décimale', () => {
    expect(formatRate(1.25)).toBe('1,25%')
    expect(formatRate(0.9, 2)).toBe('0,90%')
  })

  it('dates : JJ.MM.AAAA', () => {
    expect(formatDate(new Date('2026-07-06'))).toBe('06.07.2026')
  })
})
