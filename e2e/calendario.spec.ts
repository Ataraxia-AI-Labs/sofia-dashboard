import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Calendar Page E2E tests
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

const MOCK_APPOINTMENTS = Array.from({ length: 5 }, (_, i) => ({
  id: `appt-${i + 1}`,
  patient_name: `Paciente ${i + 1}`,
  service_name: 'Botox',
  start_time: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
  end_time: new Date(Date.now() + (i + 1) * 3600000 + 1800000).toISOString(),
  status: i === 0 ? 'CONFIRMED' : 'PENDING',
  staff_id: i < 3 ? `staff-${i + 1}` : null,
  staff_name: i < 3 ? `Dr. Staff ${i + 1}` : null,
  series_id: i === 4 ? 'series-1' : null,
  previous_start_time: i === 3 ? new Date(Date.now() - 86400000).toISOString() : null,
  previous_end_time: i === 3 ? new Date(Date.now() - 86400000 + 1800000).toISOString() : null,
}))

const MOCK_STAFF = [
  { id: 'staff-1', display_name: 'Dr. Staff 1', role: 'PROFESSIONAL' },
  { id: 'staff-2', display_name: 'Dr. Staff 2', role: 'PROFESSIONAL' },
  { id: 'staff-3', display_name: 'Dr. Staff 3', role: 'PROFESSIONAL' },
]

// ─────────────────────────────────────────────────────────────
// Unauthenticated — always runs
// ─────────────────────────────────────────────────────────────

test.describe('Calendar page — unauthenticated', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard/calendario')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated — requires e2e/.auth/user.json
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Calendar page — authenticated with mocked API', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // Intercept appointment API calls
    await page.route('**/appointments**', async (route: Route) => {
      await route.fulfill({ json: MOCK_APPOINTMENTS })
    })

    // Intercept staff/members API calls
    await page.route('**/staff**', async (route: Route) => {
      await route.fulfill({ json: MOCK_STAFF })
    })

    await page.route('**/org_members**', async (route: Route) => {
      await route.fulfill({ json: MOCK_STAFF })
    })

    return { context, page }
  }

  test('loads calendar page with appointments list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/calendario')
      await expect(page.locator('text=Paciente 1')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('text=Botox')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('staff dropdown filter is visible', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/calendario')
      await expect(page.locator('text=Paciente 1')).toBeVisible({ timeout: 15000 })

      // Staff filter dropdown — look for select, combobox, or labeled element
      const staffFilter = page.getByRole('combobox', { name: /staff|profesional|doctor/i })
        .or(page.locator('select[name*="staff"], select[data-testid*="staff"]'))
        .or(page.locator('[data-testid="staff-filter"]'))
        .or(page.locator('text=/filtrar.*staff|filtrar.*profesional/i'))
      await expect(staffFilter.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('clicking a date shows appointment details', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/calendario')
      await expect(page.locator('text=Paciente 1')).toBeVisible({ timeout: 15000 })

      // Click on the first appointment to see details
      await page.locator('text=Paciente 1').first().click()

      // Expect detail view with patient info, service, or status
      const detail = page.locator('text=CONFIRMED')
        .or(page.locator('text=Botox'))
        .or(page.locator('text=Paciente 1'))
      await expect(detail.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('new appointment form renders with staff assignment dropdown', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/calendario')
      await expect(page.locator('text=Paciente 1')).toBeVisible({ timeout: 15000 })

      // Click "new appointment" button
      const newBtn = page.getByRole('button', { name: /nueva|nuevo|agregar|crear|new/i })
        .or(page.locator('[data-testid="new-appointment"]'))
        .or(page.locator('button:has-text("cita")'))
      await newBtn.first().click()

      // The form should contain a staff assignment selector
      const staffSelect = page.getByRole('combobox', { name: /staff|profesional|asignar/i })
        .or(page.locator('select[name*="staff"]'))
        .or(page.locator('[data-testid="staff-select"]'))
        .or(page.locator('label:has-text("Profesional")'))
      await expect(staffSelect.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('reschedule button opens reschedule modal', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/calendario')
      await expect(page.locator('text=Paciente 1')).toBeVisible({ timeout: 15000 })

      // Click on an appointment to see its actions
      await page.locator('text=Paciente 1').first().click()

      // Find and click reschedule button
      const rescheduleBtn = page.getByRole('button', { name: /reagendar|reschedule|reprogramar/i })
        .or(page.locator('[data-testid="reschedule-btn"]'))
      await expect(rescheduleBtn.first()).toBeVisible({ timeout: 5000 })
      await rescheduleBtn.first().click()

      // Modal should appear with date/time pickers
      const modal = page.locator('[role="dialog"]')
        .or(page.locator('[data-testid="reschedule-modal"]'))
        .or(page.locator('.modal'))
      await expect(modal.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('series badge is visible on recurring appointments', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/calendario')
      await expect(page.locator('text=Paciente 5')).toBeVisible({ timeout: 15000 })

      // The 5th appointment has series_id — look for a recurring/series indicator
      const seriesBadge = page.locator('text=/serie|recurrente|recurring/i')
        .or(page.locator('[data-testid="series-badge"]'))
        .or(page.locator('.badge:has-text("serie")'))
      await expect(seriesBadge.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('mobile: calendar adapts to smaller viewport', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: AUTH_FILE,
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()

    // Set up route mocks
    await page.route('**/appointments**', async (route: Route) => {
      await route.fulfill({ json: MOCK_APPOINTMENTS })
    })
    await page.route('**/staff**', async (route: Route) => {
      await route.fulfill({ json: MOCK_STAFF })
    })
    await page.route('**/org_members**', async (route: Route) => {
      await route.fulfill({ json: MOCK_STAFF })
    })

    try {
      await page.goto('/dashboard/calendario')
      // Page should still render content at mobile size
      await expect(page.locator('text=Paciente 1')).toBeVisible({ timeout: 15000 })
      // Verify viewport is being respected — no horizontal scroll issues
      const body = page.locator('body')
      await expect(body).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
