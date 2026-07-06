import { test, expect } from '@playwright/test'
import { login, logout } from './helpers'

// Étanchéité RBAC : accès directs par URL et par API, par rôle.

test('non connecté : /app et /admin redirigent vers la connexion', async ({ page }) => {
  await page.goto('/fr/app')
  await expect(page).toHaveURL(/connexion/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/connexion/)
})

test('CLIENT : aucun accès au panel', async ({ page }) => {
  await login(page, 'client1@exemple.ch')
  for (const path of ['/admin', '/admin/leads', '/admin/stats', '/admin/mes-gains']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/fr\/app/)
  }
  await logout(page)
})

test('PARTNER : ne voit ni les leads, ni les stats, ni les vues closer', async ({ page }) => {
  await login(page, 'partner1@hypopilot.ch')

  for (const path of [
    '/admin/leads',
    '/admin/stats',
    '/admin/pipeline',
    '/admin/taux',
    '/admin/utilisateurs',
    '/admin/agenda',
    '/admin/mes-stats',
    '/admin/partenaires',
  ]) {
    await page.goto(path)
    await expect(page, path).toHaveURL(/\/admin$/)
  }

  // Ni les données d'un autre partner : son lien porte SON code, jamais celui
  // d'un autre apporteur, et la page ne contient aucune trace de BERNASCONI.
  await page.goto('/admin')
  await expect(page.locator('input[readonly]')).toHaveValue(/ref=LAMBERT/)
  await expect(page.getByText('BERNASCONI')).toHaveCount(0)

  // API : la fiche d'un lead est inaccessible.
  const anyLead = await page.request.get('/admin/leads')
  expect(anyLead.url()).toMatch(/\/admin$/)
  await logout(page)
})

test('CLOSER : pas de pages admin, pas de fiche d’un lead non assigné', async ({ page }) => {
  await login(page, 'closer1@hypopilot.ch')

  for (const path of ['/admin/utilisateurs', '/admin/taux', '/admin/partenaires', '/admin/stats']) {
    await page.goto(path)
    await expect(page, path).toHaveURL(/\/admin$/)
  }
  await logout(page)
})

test('API : le QR partner exige le rôle PARTNER', async ({ page }) => {
  const anon = await page.request.get('/api/partner/qr')
  expect(anon.status()).toBe(403)

  await login(page, 'client1@exemple.ch')
  const asClient = await page.request.get('/api/partner/qr')
  expect(asClient.status()).toBe(403)
  await logout(page)
})
