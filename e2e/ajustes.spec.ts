import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Settings (Ajustes) Page E2E tests
 *
 * Unauthenticated suite: always runs, requires no credentials.
 * Authenticated suite: skipped unless e2e/.auth/user.json exists
 *   (created by global-setup.ts when E2E_TEST_EMAIL / E2E_TEST_PASSWORD are set).
 *
 * The authenticated tests mock all backend API responses so they never depend
 * on a live server.
 */

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_ORG = {
  id: 'org-test-1',
  name: 'Clínica Test',
  phone: '+573001234567',
  email: 'clinica@test.com',
  address: 'Calle 100 #15-20, Bogotá',
  timezone: 'America/Bogota',
}

const MOCK_BUSINESS_HOURS = Array.from({ length: 7 }, (_, i) => ({
  id: `bh-${i}`,
  day_of_week: i,
  open_time: i < 5 ? '08:00' : i === 5 ? '09:00' : null,
  close_time: i < 5 ? '18:00' : i === 5 ? '14:00' : null,
  is_open: i < 6,
  buffer_minutes: 15,
}))

const MOCK_SERVICES = [
  { id: 'svc-1', name: 'Botox', duration_minutes: 30, price: 500000, is_active: true },
  { id: 'svc-2', name: 'Limpieza Facial', duration_minutes: 60, price: 250000, is_active: true },
  { id: 'svc-3', name: 'Relleno Labios', duration_minutes: 45, price: 800000, is_active: true },
]

const MOCK_MFA_STATUS = {
  mfa_enabled: false,
  factors: [],
}

// ─────────────────────────────────────────────────────────────
// Unauthenticated — always runs
// ─────────────────────────────────────────────────────────────

test.describe('Settings page — unauthenticated', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard/ajustes')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated — requires e2e/.auth/user.json
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Settings page — authenticated with mocked API', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // Intercept org/settings API calls
    await page.route('**/org**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_ORG })
      } else {
        await route.continue()
      }
    })

    await page.route('**/business-hours**', async (route: Route) => {
      await route.fulfill({ json: MOCK_BUSINESS_HOURS })
    })

    await page.route('**/business_hours**', async (route: Route) => {
      await route.fulfill({ json: MOCK_BUSINESS_HOURS })
    })

    await page.route('**/services**', async (route: Route) => {
      await route.fulfill({ json: MOCK_SERVICES })
    })

    await page.route('**/mfa**', async (route: Route) => {
      await route.fulfill({ json: MOCK_MFA_STATUS })
    })

    await page.route('**/2fa**', async (route: Route) => {
      await route.fulfill({ json: MOCK_MFA_STATUS })
    })

    return { context, page }
  }

  test('settings tabs are visible', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/ajustes')

      // Look for tab navigation with settings categories
      const tabArea = page.getByRole('tablist')
        .or(page.locator('[data-testid="settings-tabs"]'))
        .or(page.locator('text=/general|horarios|servicios|seguridad/i').first())
      await expect(tabArea).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('can switch between tabs', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/ajustes')

      // Wait for page to load
      const firstTab = page.getByRole('tab', { name: /general/i })
        .or(page.locator('button:has-text("General")'))
        .or(page.locator('[data-testid="tab-general"]'))
        .or(page.locator('text=General').first())
      await expect(firstTab).toBeVisible({ timeout: 15000 })

      // Try clicking a different tab (Horarios or Servicios)
      const horariosTab = page.getByRole('tab', { name: /horarios|schedule/i })
        .or(page.locator('button:has-text("Horarios")'))
        .or(page.locator('[data-testid="tab-horarios"]'))
        .or(page.locator('text=Horarios').first())
      await horariosTab.click()

      // Verify the tab content changed — look for business hours content
      const horariosContent = page.locator('text=/lunes|martes|miércoles|monday/i')
        .or(page.locator('[data-testid="business-hours"]'))
        .or(page.locator('text=/08:00|horario/i'))
      await expect(horariosContent.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('general tab shows org info form', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/ajustes')

      // The general tab should show org details form fields
      const orgForm = page.locator('input[name="name"], input[value="Clínica Test"]')
        .or(page.locator('text=Clínica Test'))
        .or(page.locator('input[name="phone"]'))
        .or(page.locator('input[name="email"]'))
      await expect(orgForm.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('security tab shows 2FA section', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/ajustes')

      // Navigate to security tab
      const securityTab = page.getByRole('tab', { name: /seguridad|security/i })
        .or(page.locator('button:has-text("Seguridad")'))
        .or(page.locator('[data-testid="tab-seguridad"]'))
        .or(page.locator('text=Seguridad').first())
      await expect(securityTab).toBeVisible({ timeout: 15000 })
      await securityTab.click()

      // Look for 2FA / MFA section
      const twoFaSection = page.locator('text=/2FA|MFA|autenticación|dos factores|two.factor/i')
        .or(page.locator('[data-testid="2fa-section"]'))
      await expect(twoFaSection.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('business hours grid renders', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/ajustes')

      // Navigate to horarios tab
      const horariosTab = page.getByRole('tab', { name: /horarios|schedule/i })
        .or(page.locator('button:has-text("Horarios")'))
        .or(page.locator('[data-testid="tab-horarios"]'))
        .or(page.locator('text=Horarios').first())
      await expect(horariosTab).toBeVisible({ timeout: 15000 })
      await horariosTab.click()

      // The business hours grid should show days of the week
      const dayLabels = page.locator('text=/lunes|monday/i')
        .or(page.locator('[data-testid="business-hours-grid"]'))
      await expect(dayLabels.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })
})
