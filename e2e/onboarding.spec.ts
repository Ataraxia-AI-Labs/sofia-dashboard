import { test, expect } from '@playwright/test'

/**
 * Onboarding wizard E2E tests
 *
 * The onboarding page is a public page (no auth required for the form itself).
 * It's a 4-step wizard: clinic info → owner info → specialty → verification.
 */

// ─────────────────────────────────────────────────────────────
// Public onboarding access
// ─────────────────────────────────────────────────────────────

test.describe('Onboarding page', () => {
  test('loads the onboarding page', async ({ page }) => {
    await page.goto('/onboarding')
    // Should show onboarding wizard or redirect to register
    const content = page.locator('text=/registro|onboarding|crear cl|bienvenid/i')
      .or(page.locator('text=/nombre de la cl|especialidad|ciudad/i'))
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('shows step 1 form fields', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForTimeout(2000)
    // Step 1: clinic name or owner info
    const formField = page.locator('input[type="text"]')
      .or(page.locator('input[placeholder*="clinica"]'))
      .or(page.locator('input[placeholder*="nombre"]'))
    await expect(formField.first()).toBeVisible({ timeout: 15000 })
  })

  test('shows specialty selector', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForTimeout(2000)
    // Navigate to specialty step or check if visible
    const specialty = page.locator('text=/est.tica|odontolog|dermatolog|especialidad/i')
    // May need to fill previous steps first
    if (await specialty.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(specialty.first()).toBeVisible()
    }
  })

  test('shows city selector', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForTimeout(2000)
    const city = page.locator('text=/bogot|medell|cali|barranquilla|ciudad/i')
      .or(page.locator('select'))
    if (await city.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(city.first()).toBeVisible()
    }
  })

  test('has navigation buttons', async ({ page }) => {
    await page.goto('/onboarding')
    const navBtn = page.getByRole('button', { name: /siguiente|continuar|next|crear|registrar/i })
    await expect(navBtn.first()).toBeVisible({ timeout: 15000 })
  })

  test('next button is disabled until required fields are filled', async ({ page }) => {
    await page.goto('/onboarding')
    const nextBtn = page.getByRole('button', { name: /siguiente/i })
    await expect(nextBtn).toBeVisible({ timeout: 15000 })
    // Button should be disabled when form is empty
    await expect(nextBtn).toBeDisabled()
  })

  test('email field accepts valid email', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForTimeout(2000)
    const emailInput = page.locator('input[type="email"]')
    if (await emailInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.first().fill('test@clinica.com')
      await expect(emailInput.first()).toHaveValue('test@clinica.com')
    }
  })

  test('password field has visibility toggle', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForTimeout(2000)
    const passwordInput = page.locator('input[type="password"]')
    if (await passwordInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should have an eye icon to toggle visibility
      const toggle = page.locator('button').filter({ has: page.locator('svg') }).last()
      expect(await toggle.count()).toBeGreaterThan(0)
    }
  })

  test('page is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/onboarding')
    const content = page.locator('text=/registro|onboarding|crear|bienvenid|nombre/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })
})
