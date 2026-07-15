import { test, expect } from '@playwright/test'
import { defaultHotMonth, fillRenewalFunnel, login, logout, uniqueEmail } from './helpers'

// LE parcours cœur : visiteur → simulation chaude → lead + signal CALLBACK
// → le closer le traite → SIGNE → commissions créées (partner + closer).

test.describe('renouvellement chaud, de bout en bout', () => {
  const clientEmail = uniqueEmail('chaud')
  const clientName = `E2E Chaud ${Date.now()}`

  test('visiteur : simulation → résultat → appel d’offres + rappel', async ({ page }) => {
    await fillRenewalFunnel(page, {
      path: '/fr/renouveler?ref=LAMBERT&utm_source=e2e',
      continueLabel: 'Continuer',
      resultLabel: 'Voir mon résultat',
    })

    // RÈGLE UX : le résultat s'affiche avant toute demande d'email.
    await expect(page.getByText('Vous perdez environ')).toBeVisible()
    await expect(page.locator('#r-email')).toHaveCount(0)
    await expect(page.getByText('Votre fenêtre est ouverte')).toBeVisible()

    await page.getByRole('button', { name: "Lancer l'appel d'offres" }).click()
    await page.fill('#r-name', clientName)
    await page.fill('#r-email', clientEmail)
    await page.fill('#r-phone', '+41 79 000 00 00')
    await page.locator('#r-callback').click()
    await expect(page.locator('#r-callback')).toHaveAttribute('data-state', 'checked')
    await page.getByRole('button', { name: "Lancer l'appel d'offres" }).click()

    await expect(page.getByText("Appel d'offres lancé")).toBeVisible({ timeout: 15_000 })
  })

  test('closer : le signal est dans la file, il le prend et signe', async ({ page }) => {
    await login(page, 'closer1@hyporadar.ch')
    await expect(page.getByRole('heading', { name: 'Ma file' })).toBeVisible()

    // Le lead créé au test précédent est dans le pool (non assigné) → claim.
    const row = page.locator('li', { hasText: clientName }).first()
    await expect(row).toBeVisible()
    await expect(row.getByText('Rappel demandé')).toBeVisible()
    await row.getByRole('button', { name: 'Prendre' }).click()

    // Après le claim, les actions apparaissent ; on ouvre la fiche.
    await expect(row.getByRole('button', { name: 'Traité' })).toBeVisible()
    await row.getByRole('link', { name: clientName }).click()
    await expect(page.getByText('Économie potentielle')).toBeVisible()
    await expect(page.getByText('Script — Rappel demandé')).toBeVisible()

    // Traiter le signal puis pousser le statut jusqu'à SIGNE.
    await page.getByRole('button', { name: 'Traité' }).first().click()
    const statusSelect = page.locator('[data-slot="select-trigger"]').last()
    for (const label of ['Contacté', 'Dossier en cours', 'Dossier complet', 'Signé']) {
      await statusSelect.click()
      await page.getByRole('option', { name: label, exact: true }).click()
      await page.waitForTimeout(400)
    }
    await logout(page)
  })

  test('partner : le gain apparaît dans son espace', async ({ page }) => {
    await login(page, 'partner1@hyporadar.ch')
    await page.goto('/admin/mes-gains')
    const row = page.locator('li', { hasText: clientName })
    await expect(row).toBeVisible()
    await expect(row.getByText('Due')).toBeVisible()
    await expect(row.getByText('CHF 500')).toBeVisible()
    await logout(page)
  })

  test('admin : commissions closer + partner créées', async ({ page }) => {
    await login(page, 'admin@hyporadar.ch')
    await page.goto('/admin/partenaires')
    await expect(page.locator('li', { hasText: clientName }).getByText('CHF 500')).toBeVisible()
    await logout(page)
  })
})

test('funnel renouvellement en allemand (/de/verlaengern)', async ({ page }) => {
  await fillRenewalFunnel(page, {
    path: '/de/verlaengern',
    continueLabel: 'Weiter',
    resultLabel: 'Mein Ergebnis anzeigen',
  })
  await expect(page.getByText('Sie verlieren rund')).toBeVisible()
  await expect(page.getByText('Ihr Zeitfenster ist offen')).toBeVisible()
  await page.getByRole('button', { name: 'Ausschreibung starten' }).click()
  await page.fill('#r-name', 'E2E Deutsch')
  await page.fill('#r-email', uniqueEmail('de'))
  await page.fill('#r-phone', '+41 79 111 11 11')
  await page.getByRole('button', { name: 'Ausschreibung starten' }).click()
  await expect(page.getByText('Ausschreibung gestartet')).toBeVisible({ timeout: 15_000 })
})

test('funnel renouvellement en italien (/it/rinnovare)', async ({ page }) => {
  await fillRenewalFunnel(page, {
    path: '/it/rinnovare',
    continueLabel: 'Continuare',
    resultLabel: 'Vedere il mio risultato',
  })
  await expect(page.getByText('Perde circa')).toBeVisible()
  await page.getByRole('button', { name: "Lanciare la gara d'offerte" }).click()
  await page.fill('#r-name', 'E2E Italiano')
  await page.fill('#r-email', uniqueEmail('it'))
  await page.fill('#r-phone', '+41 79 222 22 22')
  await page.getByRole('button', { name: "Lanciare la gara d'offerte" }).click()
  await expect(page.getByText("Gara d'offerte lanciata")).toBeVisible({ timeout: 15_000 })
})

test('échéance lointaine → surveillance (froid)', async ({ page }) => {
  const d = new Date()
  d.setMonth(d.getMonth() + 30)
  await fillRenewalFunnel(page, {
    path: '/fr/renouveler',
    continueLabel: 'Continuer',
    resultLabel: 'Voir mon résultat',
    rate: '1,40',
    endMonth: d.toISOString().slice(0, 7),
  })
  await expect(page.getByText('Trop tôt pour agir')).toBeVisible()
  await page.getByRole('button', { name: 'Activer la surveillance gratuite' }).click()
  await page.fill('#r-name', 'E2E Froid')
  await page.fill('#r-email', uniqueEmail('froid'))
  await page.getByRole('button', { name: 'Activer la surveillance' }).click()
  await expect(page.getByText('Surveillance activée')).toBeVisible({ timeout: 15_000 })
})

// L'échéance sous 10 mois garantit un lead chaud.
void defaultHotMonth
