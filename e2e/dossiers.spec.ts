import { test, expect } from '@playwright/test'
import { login, logout } from './helpers'

// Dossier Wizard public + vue admin versionnée.
// ⚠️ Le seed doit avoir tourné (dossier démo demo-dossier-0001, 3+ versions).

test.describe('wizard /dossier (public, anonyme)', () => {
  test('la section Bien se déroule en progressive disclosure et calibre les offres', async ({
    page,
  }) => {
    await page.goto('/fr/dossier')

    // Q1 usage — les suivantes n'existent pas encore
    await expect(page.locator('#question-usage')).toBeVisible()
    await expect(page.locator('#question-typeBien')).toHaveCount(0)
    await page.locator('#question-usage [role=radio]').first().click()

    // Q2 type : maison → sous-question appartement annexe
    await expect(page.locator('#question-typeBien')).toBeVisible()
    await page.locator('#question-typeBien [role=radio]').first().click()
    await page.locator('#w-annexe-non').click()

    // Q3 NPA autocomplete
    await page.fill('#w-npa', '1095')
    await page.getByRole('option', { name: /1095 Lutry/ }).click()

    // Standard éco (minergie) + chauffage (PAC)
    await page.locator('#question-labelEco [role=radio]').nth(1).click()
    await page.locator('#question-chauffage [role=radio]').nth(2).click()

    // Cas spéciaux ×4 : non
    for (const key of ['droitHabitation', 'usufruit', 'droitSuperficie', 'zoneAgricole']) {
      await page.locator(`#w-${key}-non`).click()
    }

    // Valeur + source
    await page.fill('#w-valeur', '1250000')
    await expect(page.locator('#w-valeur')).toHaveValue("1'250'000")
    await page.locator('#question-valeur [role=radio]').first().click()

    // Tranche existante (le sous-formulaire s'ouvre seul)
    await page.fill('#w-tr-montant', '650000')
    await page.fill('#w-tr-echeance', '30062027')
    await expect(page.locator('#w-tr-echeance')).toHaveValue('30.06.2027')
    await page
      .locator('#question-tranchesExistantes')
      .getByRole('button', { name: 'Terminé' })
      .click()

    // Autres biens : non → section Bien complète
    await page.locator('#w-autres-biens-non').click()
    await expect(page.locator('[id^="question-"][data-status="required"]')).toHaveCount(0)

    // Le panneau d'offres affiche une fourchette (rabais éco + LTV basse)
    await expect(page.locator('#offres, div.fixed.inset-x-0.bottom-0').first()).toContainText('%')

    // La sauvegarde serveur versionnée part en arrière-plan (debounce 5s)
    await page.waitForTimeout(5_600)
    const dossierId = await page.evaluate(
      () => JSON.parse(window.localStorage.getItem('hp-dossier') ?? '{}').dossierId
    )
    expect(dossierId).toBeTruthy()

    // Reprise auto après rechargement
    await page.reload()
    await expect(page.locator('#question-usage')).toHaveAttribute('data-status', 'complete')
  })
})

test.describe('admin /admin/dossiers (versionnage immuable)', () => {
  test('closer : édition = nouvelle version avec commentaire obligatoire, diff, restauration', async ({
    page,
  }) => {
    await login(page, 'closer1@hypopilot.ch')
    await page.goto('/admin/dossiers')
    await expect(page.getByRole('heading', { name: 'Dossiers' })).toBeVisible()

    // Fiche du dossier démo (assigné à closer1)
    await page.goto('/admin/dossiers/demo-dossier-0001')
    await expect(page.getByRole('heading', { name: /Jean Rochat/ })).toBeVisible()
    const versionTrigger = page.getByLabel('Version affichée')
    await expect(versionTrigger).toContainText('(actuelle)')
    const before = await versionTrigger.textContent()
    const currentNumero = Number(before?.match(/v(\d+)/)?.[1] ?? 0)
    expect(currentNumero).toBeGreaterThanOrEqual(3)

    // Édition versionnée : le bouton sans commentaire reste désactivé (closer)
    await page.getByRole('button', { name: 'Modifier' }).click()
    await expect(page.getByText('Mode édition')).toBeVisible()
    const save = page.getByRole('button', { name: 'Enregistrer comme nouvelle version' })
    await expect(save).toBeDisabled()

    await page.fill('#w-valeur', '1400000')
    await page.fill('#edit-commentaire', 'Test E2E : valeur corrigée après appel.')
    await save.click()
    await expect(page.getByLabel('Version affichée')).toContainText(
      `v${currentNumero + 1} (actuelle)`,
      { timeout: 15_000 }
    )
    await expect(page.getByText('Test E2E : valeur corrigée')).toBeVisible()

    // Diff entre l'ancienne actuelle et la nouvelle : la valeur apparaît
    await page.goto(
      `/admin/dossiers/demo-dossier-0001?compare=${currentNumero}-${currentNumero + 1}`
    )
    await expect(page.getByText(`Comparaison v${currentNumero} → v${currentNumero + 1}`)).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Bien · Valeur du bien' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '1400000' })).toBeVisible()

    // Restauration : une ancienne version est en lecture seule, la restaurer crée n+2
    await page.goto('/admin/dossiers/demo-dossier-0001?v=1')
    await expect(page.getByText('Lecture seule — ancienne version')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Modifier' })).toHaveCount(0)
    page.on('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Restaurer comme nouvelle version' }).click()
    await expect(page.getByLabel('Version affichée')).toContainText(
      `v${currentNumero + 2} (actuelle)`,
      { timeout: 15_000 }
    )
    await expect(page.getByText(`« Restauration de la v1 »`)).toBeVisible()

    await logout(page)
  })

  test("un autre closer n'accède pas au dossier, l'export est réservé ADMIN", async ({
    page,
    request,
  }) => {
    await login(page, 'closer2@hypopilot.ch')
    const res = await page.goto('/admin/dossiers/demo-dossier-0001')
    expect(res?.status()).toBe(404)

    // Export : interdit à un closer (403), l'API vérifie le rôle serveur
    const forbidden = await request.get('/api/admin/dossiers/demo-dossier-0001/export')
    expect(forbidden.status()).toBe(403)
    await logout(page)

    // ADMIN : export JSON complet avec toutes les versions
    await login(page, 'admin@hypopilot.ch')
    const exportRes = await page.request.get('/api/admin/dossiers/demo-dossier-0001/export')
    expect(exportRes.status()).toBe(200)
    const json = (await exportRes.json()) as { versions: unknown[] }
    expect(json.versions.length).toBeGreaterThanOrEqual(3)
    await logout(page)
  })
})
