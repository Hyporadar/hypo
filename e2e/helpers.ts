import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Password123!'

export async function login(page: Page, email: string) {
  await page.goto('/fr/connexion')
  await page.fill('#email', email)
  await page.fill('#password', PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/(admin|fr\/app)/, { timeout: 15_000 })
}

export async function logout(page: Page) {
  await page.context().clearCookies()
}

/** Remplit le funnel renouvellement jusqu'au résultat (labels localisés fournis). */
export async function fillRenewalFunnel(
  page: Page,
  opts: {
    path: string
    continueLabel: string
    resultLabel: string
    amount?: string
    rate?: string
    endMonth?: string
    propertyValue?: string
  }
) {
  await page.goto(opts.path)
  await page.fill('#amount', opts.amount ?? '650000')
  await page.getByRole('button', { name: opts.continueLabel, exact: true }).click()
  await page.fill('#rate', opts.rate ?? '2,10')
  await page.getByRole('button', { name: opts.continueLabel, exact: true }).click()
  await page.locator('#lender').click()
  await page.getByRole('option', { name: 'UBS', exact: true }).click()
  await page.getByRole('button', { name: opts.continueLabel, exact: true }).click()
  await page.fill('#endMonth', opts.endMonth ?? defaultHotMonth())
  await page.getByRole('button', { name: opts.continueLabel, exact: true }).click()
  await page.fill('#propertyValue', opts.propertyValue ?? '1050000')
  await page.getByRole('button', { name: opts.resultLabel }).click()
}

/** Échéance à ~10 mois : lead chaud quel que soit le jour du test. */
export function defaultHotMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 10)
  return d.toISOString().slice(0, 7)
}

/** Échéance à ~30 mois : lead froid. */
export function coldMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 30)
  return d.toISOString().slice(0, 7)
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@e2e.local`
}

export { expect }
