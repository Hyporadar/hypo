import { test, expect } from '@playwright/test'
import { uniqueEmail } from './helpers'

// Funnel achat jusqu'au certificat PDF + page de vérification.
test('achat : simulation → résultat → certificat PDF → /verify', async ({ page }) => {
  await page.goto('/fr/acheter')

  await page.fill('#price', '1000000')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.fill('#ownFunds', '200000')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.fill('#income', '185000')
  await page.getByRole('button', { name: 'Voir mon résultat' }).click()

  // Résultat AVANT l'email — capacité, fourchette, mensualité.
  await expect(page.getByText('Votre projet est finançable')).toBeVisible()
  await expect(page.getByText("CHF 1'000'000").first()).toBeVisible()
  await expect(page.locator('#email')).toHaveCount(0)

  await page.getByRole('button', { name: 'Recevoir mon certificat PDF' }).click()
  await page.fill('#name', 'E2E Acheteur')
  await page.fill('#email', uniqueEmail('achat'))
  await page.getByRole('button', { name: 'Obtenir mon certificat' }).click()

  await expect(page.getByText('Votre certificat est émis')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/HP-\d{4}-\d{6}/)).toBeVisible()

  // Le PDF se télécharge et la page de vérification confirme l'authenticité.
  const pdfHref = await page.getByRole('link', { name: 'Télécharger le PDF' }).getAttribute('href')
  expect(pdfHref).toMatch(/\/api\/certificates\/.+\/pdf/)

  const pdfResponse = await page.request.get(pdfHref!)
  expect(pdfResponse.status()).toBe(200)
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf')

  const certificateId = pdfHref!.split('/')[3]
  await page.goto(`/verify/${certificateId}`)
  await expect(page.getByText('Certificat authentique')).toBeVisible()
  await expect(page.getByText('E2E Acheteur')).toBeVisible()
})

test('achat en allemand : certificat dans la langue du client', async ({ page }) => {
  await page.goto('/de/kaufen')
  await page.fill('#price', '800000')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.fill('#ownFunds', '200000')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.fill('#income', '160000')
  await page.getByRole('button', { name: 'Mein Ergebnis anzeigen' }).click()
  await expect(page.getByText('Ihr Vorhaben ist finanzierbar')).toBeVisible()

  await page.getByRole('button', { name: 'Mein PDF-Zertifikat erhalten' }).click()
  await page.fill('#name', 'E2E Käufer')
  await page.fill('#email', uniqueEmail('kauf'))
  await page.getByRole('button', { name: 'Zertifikat erhalten' }).click()
  await expect(page.getByText('Ihr Zertifikat ist ausgestellt')).toBeVisible({ timeout: 15_000 })

  // Le certificat est bien en allemand : la page de vérification (rendue dans
  // la langue du certificat) s'affiche en allemand.
  const pdfHref = await page.getByRole('link', { name: 'PDF herunterladen' }).getAttribute('href')
  const pdf = await page.request.get(pdfHref!)
  expect(pdf.status()).toBe(200)
  const certificateId = pdfHref!.split('/')[3]
  await page.goto(`/verify/${certificateId}`)
  await expect(page.getByText('Echtes Zertifikat')).toBeVisible()
})

test('clavier : le funnel achat est navigable sans souris', async ({ page }) => {
  await page.goto('/fr/acheter')
  await page.locator('#price').focus()
  await page.keyboard.type('900000')
  await page.keyboard.press('Tab') // → bouton Continuer
  await page.keyboard.press('Enter')
  await expect(page.locator('#ownFunds')).toBeVisible()
  // Chaque champ a un label associé.
  await expect(page.locator('label[for="ownFunds"]')).toBeVisible()
})
