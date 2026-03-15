import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Dashboard Home Page E2E tests
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

const MOCK_ANALYTICS = {
  total_patients: 142,
  total_appointments: 87,
  total_revenue: 15400000,
  appointments_today: 6,
  new_patients_this_week: 12,
  conversion_rate: 0.34,
}

const MOCK_TODAY_APPOINTMENTS = Array.from({ length: 4 }, (_, i) => ({
  id: `today-appt-${i + 1}`,
  patient_name: `Paciente Hoy ${i + 1}`,
  service_name: i % 2 === 0 ? 'Botox' : 'Limpieza facial',
  start_time: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
  end_time: new Date(Date.now() + (i + 1) * 3600000 + 1800000).toISOString(),
  status: 'CONFIRMED',
  staff_name: `Dr. Staff ${i + 1}`,
}))

const MOCK_RECENT_ACTIVITY = Array.from({ length: 5 }, (_, i) => ({
  id: `activity-${i + 1}`,
  patient_name: `Paciente Actividad ${i + 1}`,
  type: i % 2 === 0 ? 'WHATSAPP' : 'CALL',
  summary: `Consulta sobre tratamiento ${i + 1}`,
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
}))

// ─────────────────────────────────────────────────────────────
// Unauthenticated — always runs
// ─────────────────────────────────────────────────────────────

test.describe('Dashboard home — unauthenticated', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated — requires e2e/.auth/user.json
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Dashboard home — authenticated with mocked API', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // Intercept analytics / dashboard summary endpoints
    await page.route('**/analytics**', async (route: Route) => {
      await route.fulfill({ json: MOCK_ANALYTICS })
    })

    await page.route('**/dashboard**', async (route: Route) => {
      // Only intercept API calls, not page navigation
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({
          json: {
            ...MOCK_ANALYTICS,
            today_appointments: MOCK_TODAY_APPOINTMENTS,
            recent_activity: MOCK_RECENT_ACTIVITY,
          },
        })
      } else {
        await route.continue()
      }
    })

    await page.route('**/appointments**', async (route: Route) => {
      await route.fulfill({ json: MOCK_TODAY_APPOINTMENTS })
    })

    await page.route('**/interactions**', async (route: Route) => {
      await route.fulfill({ json: MOCK_RECENT_ACTIVITY })
    })

    return { context, page }
  }

  test('renders metric cards', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard')

      // Look for metric-related content — numbers, labels, or card containers
      const metricsArea = page.locator('[data-testid="metrics"], [class*="metric"], [class*="card"], [class*="stat"]')
        .or(page.locator('text=/pacientes|citas|ingresos|patients|appointments|revenue/i'))
      await expect(metricsArea.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays today appointments section', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard')

      // Look for a "today" or "hoy" section heading or appointments content
      const todaySection = page.locator('text=/hoy|today|citas del d/i')
        .or(page.locator('[data-testid="today-appointments"]'))
      await expect(todaySection.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows recent activity or interactions', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard')

      // Look for activity/interactions section
      const activitySection = page.locator('text=/actividad|interacciones|recientes|activity/i')
        .or(page.locator('[data-testid="recent-activity"]'))
      await expect(activitySection.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('navigation links in sidebar are active', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard')

      const nav = page.locator('nav[aria-label="Menu principal"]')
        .or(page.locator('nav').first())
      await expect(nav).toBeVisible({ timeout: 15000 })

      // Core navigation links should be present
      await expect(page.locator('a[href="/dashboard/pacientes"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('a[href="/dashboard/calendario"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('a[href="/dashboard/conversaciones"]')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })
})
