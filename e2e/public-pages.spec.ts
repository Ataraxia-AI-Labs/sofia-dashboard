import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Public pages E2E tests
 * Covers: portal, booking, legal pages, 403, MFA, forgot/reset password
 */

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_PORTAL_DATA = {
  patient_name: 'Maria Lopez',
  clinic_name: 'Clinica Bella Vista',
  upcoming_appointments: [
    {
      id: 'appt-1',
      service_name: 'Botox',
      start_time: new Date(Date.now() + 3 * 86400000).toISOString(),
      staff_name: 'Dra. Ana Martinez',
      status: 'CONFIRMED',
    },
  ],
  recent_payments: [
    { id: 'pay-1', amount: 350000, status: 'PAID', created_at: new Date().toISOString() },
  ],
  gamification: { points: 250, level: 'Silver', next_level_points: 500 },
}

// ─────────────────────────────────────────────────────────────
// Legal pages
// ─────────────────────────────────────────────────────────────

test.describe('Legal pages', () => {
  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/legal/privacidad')
    const content = page.locator('text=/privacidad|privacy|datos personales|pol.tica/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/legal/terminos')
    const content = page.locator('text=/t.rminos|condiciones|terms|servicio/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('privacy page is accessible without auth', async ({ page }) => {
    await page.goto('/legal/privacidad')
    // Should NOT redirect to /login
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('/login')
  })

  test('terms page is accessible without auth', async ({ page }) => {
    await page.goto('/legal/terminos')
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('/login')
  })
})

// ─────────────────────────────────────────────────────────────
// 403 Forbidden page
// ─────────────────────────────────────────────────────────────

test.describe('403 page', () => {
  test('loads the 403 page', async ({ page }) => {
    await page.goto('/403')
    const content = page.locator('text=/403|acceso|permiso|denegad|forbidden|autoriza/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('403 page has navigation link back', async ({ page }) => {
    await page.goto('/403')
    const link = page.locator('a[href="/"]')
      .or(page.locator('a[href="/dashboard"]'))
      .or(page.getByRole('link', { name: /inicio|volver|home|dashboard/i }))
    await expect(link.first()).toBeVisible({ timeout: 15000 })
  })
})

// ─────────────────────────────────────────────────────────────
// Forgot password
// ─────────────────────────────────────────────────────────────

test.describe('Forgot password page', () => {
  test('loads forgot password page', async ({ page }) => {
    await page.goto('/forgot-password')
    const content = page.locator('text=/contrase|password|recuperar|olvidaste|reset/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('has email input field', async ({ page }) => {
    await page.goto('/forgot-password')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 15000 })
  })

  test('has submit button', async ({ page }) => {
    await page.goto('/forgot-password')
    const submitBtn = page.getByRole('button', { name: /enviar|recuperar|reset|submit/i })
    await expect(submitBtn).toBeVisible({ timeout: 15000 })
  })

  test('submit button is disabled when email is empty', async ({ page }) => {
    await page.goto('/forgot-password')
    const submitBtn = page.getByRole('button', { name: /enviar enlace/i })
    await expect(submitBtn).toBeVisible({ timeout: 15000 })
    // Button should be disabled until email is filled
    await expect(submitBtn).toBeDisabled()
  })
})

// ─────────────────────────────────────────────────────────────
// MFA page
// ─────────────────────────────────────────────────────────────

test.describe('MFA page', () => {
  test('loads MFA page', async ({ page }) => {
    await page.goto('/mfa')
    const content = page.locator('text=/verificaci|MFA|autenticaci|c.digo|factor/i')
      .or(page.locator('input[type="text"]'))
      .or(page.locator('input[inputmode="numeric"]'))
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('has code input fields', async ({ page }) => {
    await page.goto('/mfa')
    const inputs = page.locator('input')
    expect(await inputs.count()).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────
// Patient Portal (token-based)
// ─────────────────────────────────────────────────────────────

test.describe('Patient portal', () => {
  test('loads portal with mock token', async ({ page }) => {
    // Intercept portal API calls
    await page.route('**/portal/**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_PORTAL_DATA })
      } else {
        await route.continue()
      }
    })

    await page.goto('/portal/test-token-123')
    // Portal should show patient info or error
    const content = page.locator('text=/portal|paciente|clinica|cita/i')
      .or(page.locator('text=/Maria Lopez|Bella Vista/'))
      .or(page.locator('text=/token|invalid|expirad/i'))
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('portal page does not require login', async ({ page }) => {
    await page.route('**/portal/**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: MOCK_PORTAL_DATA })
      } else {
        await route.continue()
      }
    })

    await page.goto('/portal/test-token-123')
    await page.waitForTimeout(3000)
    // Should NOT redirect to /login
    expect(page.url()).not.toContain('/login')
  })
})

// ─────────────────────────────────────────────────────────────
// Booking page (public)
// ─────────────────────────────────────────────────────────────

test.describe('Booking page', () => {
  test('loads booking page with org ID', async ({ page }) => {
    await page.goto('/book/test-org-123')
    // Page may show booking form OR "no tiene reservas habilitadas" message
    const content = page.locator('text=/reservar|book|agendar|cita|clinica|reservas|habilitad/i')
      .or(page.locator('text=/no encontrad|invalid|no tiene/i'))
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('booking page does not require login', async ({ page }) => {
    await page.route('**/public/**', async (route: Route) => {
      await route.fulfill({ json: { org_name: 'Test', services: [], available_slots: [] } })
    })

    await page.goto('/book/test-org-123')
    await page.waitForTimeout(3000)
    expect(page.url()).not.toContain('/login')
  })
})

// ─────────────────────────────────────────────────────────────
// Admin routes protection
// ─────────────────────────────────────────────────────────────

test.describe('Admin routes - unauthenticated', () => {
  test('admin metricas redirects to login', async ({ page }) => {
    await page.goto('/admin/metricas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin org creation redirects to login', async ({ page }) => {
    await page.goto('/admin/organizaciones/nueva')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin pipeline redirects to login', async ({ page }) => {
    await page.goto('/admin/pipeline')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Admin pages — authenticated (non-admin gets redirected)
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Admin routes - authenticated non-admin', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()
    return { context, page }
  }

  test('non-admin is redirected from /admin', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/admin/metricas')
      await page.waitForTimeout(3000)
      // Should redirect to /dashboard or show 403
      const url = page.url()
      const redirected = url.includes('/dashboard') || url.includes('/403') || url.includes('/login')
      expect(redirected).toBe(true)
    } finally {
      await context.close()
    }
  })
})
