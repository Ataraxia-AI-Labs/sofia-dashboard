import { test, expect } from '@playwright/test'

/**
 * Mobile Responsive E2E tests
 *
 * Uses iPhone 14 viewport (390x844) to verify that public pages render
 * correctly on mobile devices. No authentication required.
 */

// ─────────────────────────────────────────────────────────────
// Mobile viewport configuration (iPhone 14)
// ─────────────────────────────────────────────────────────────

const MOBILE_VIEWPORT = { width: 390, height: 844 }

test.describe('Mobile responsive — public pages', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('login page is usable on mobile', async ({ page }) => {
    await page.goto('/login')

    // Email and password fields should be visible and usable
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()

    // Submit button should be visible
    const submitBtn = page.getByRole('button', { name: /entrar|iniciar|login/i })
    await expect(submitBtn).toBeVisible()

    // Inputs should be tappable — verify no overflow hides them
    const emailBox = await emailInput.boundingBox()
    expect(emailBox).toBeTruthy()
    expect(emailBox!.width).toBeGreaterThan(100)

    // Verify the page fits within the mobile viewport (no horizontal scroll)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 10)
  })

  test('onboarding page renders correctly on mobile', async ({ page }) => {
    await page.goto('/onboarding')

    // A heading should be visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })

    // Form elements should be present and visible
    const formInputs = page.locator('input, select, textarea')
    await expect(formInputs.first()).toBeVisible({ timeout: 5000 })

    // Verify the page fits within the mobile viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 10)
  })

  test('forgot password page is accessible on mobile', async ({ page }) => {
    await page.goto('/forgot-password')

    // Email input must be visible and usable
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 15000 })

    // Submit / send button should be visible
    const submitBtn = page.getByRole('button', { name: /enviar|recuperar|send|reset/i })
      .or(page.locator('button[type="submit"]'))
    await expect(submitBtn.first()).toBeVisible()

    // Verify the page fits within the mobile viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 10)
  })
})
