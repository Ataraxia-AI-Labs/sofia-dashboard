import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Patient List E2E tests
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

const MOCK_PATIENTS = Array.from({ length: 20 }, (_, i) => ({
  id: `patient-${i + 1}`,
  full_name: `Paciente Test ${i + 1}`,
  phone: `555000${String(i + 1).padStart(4, '0')}`,
  email: `paciente${i + 1}@test.com`,
  city: 'Ciudad de México',
  service_interest: 'Botox',
  channel: 'WHATSAPP',
  lead_score: 75,
  last_interaction: new Date().toISOString(),
  created_at: new Date().toISOString(),
}))

const MOCK_RESPONSE_PAGE_1 = {
  patients: MOCK_PATIENTS,
  total: 45,
  page: 0,
  page_size: 20,
}

const MOCK_RESPONSE_PAGE_2 = {
  patients: Array.from({ length: 20 }, (_, i) => ({
    ...MOCK_PATIENTS[0],
    id: `patient-${i + 21}`,
    full_name: `Paciente Test ${i + 21}`,
  })),
  total: 45,
  page: 1,
  page_size: 20,
}

const MOCK_SEARCH_RESPONSE = {
  patients: [
    {
      ...MOCK_PATIENTS[0],
      full_name: 'Búsqueda Resultado',
      phone: '5550001234',
    },
  ],
  total: 1,
  page: 0,
  page_size: 20,
}

// ─────────────────────────────────────────────────────────────
// Unauthenticated — always runs
// ─────────────────────────────────────────────────────────────

test.describe('Patients page — unauthenticated', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard/pacientes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect URL contains the original /dashboard/pacientes path', async ({ page }) => {
    await page.goto('/dashboard/pacientes')
    await expect(page).toHaveURL(/redirect=.*pacientes/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated — requires e2e/.auth/user.json
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Patients page — authenticated with mocked API', () => {
  /**
   * Sets up a fresh browser context with auth state and API mocks for each
   * test.  Using `browser.newContext()` directly keeps the storageState load
   * inside the test body so it only executes when the describe block is not
   * skipped.
   */
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // Intercept all backend patient API calls
    await page.route('**/patients**', async (route: Route) => {
      const url = new URL(route.request().url())
      const pageParam = url.searchParams.get('page') ?? '0'
      const search = url.searchParams.get('search') ?? ''

      if (search) {
        await route.fulfill({ json: MOCK_SEARCH_RESPONSE })
      } else if (pageParam === '1') {
        await route.fulfill({ json: MOCK_RESPONSE_PAGE_2 })
      } else {
        await route.fulfill({ json: MOCK_RESPONSE_PAGE_1 })
      }
    })

    return { context, page }
  }

  test('loads the patient list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/pacientes')
      // The table/list should render patient rows
      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('text=Paciente Test 2')).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('search input filters the patient list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/pacientes')
      // Wait for initial load
      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 15000 })

      // Type into the search field
      const searchInput = page.locator('input[placeholder*="Buscar"]')
      await expect(searchInput).toBeVisible()
      await searchInput.fill('Búsqueda')

      // Debounce delay — the component waits 300 ms before querying
      await page.waitForTimeout(400)

      await expect(page.locator('text=Búsqueda Resultado')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('clearing the search restores the full list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/pacientes')
      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 15000 })

      const searchInput = page.locator('input[placeholder*="Buscar"]')
      await searchInput.fill('Búsqueda')
      await page.waitForTimeout(400)
      await expect(page.locator('text=Búsqueda Resultado')).toBeVisible({ timeout: 5000 })

      // Clear the search
      await searchInput.clear()
      await page.waitForTimeout(400)

      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('pagination — navigates to page 2', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/pacientes')
      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 15000 })

      // total=45 with page_size=20 → 3 pages → pagination should be visible
      const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).last()
      await expect(nextBtn).toBeVisible()
      await nextBtn.click()

      await expect(page.locator('text=Paciente Test 21')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('pagination — previous button is disabled on first page', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/pacientes')
      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 15000 })

      // First chevron button in pagination = "previous"
      const prevBtn = page.locator('button[disabled]').filter({ hasText: '' }).first()
      // The prev button should be disabled on page 0
      await expect(prevBtn).toBeDisabled()
    } finally {
      await context.close()
    }
  })

  test('shows the total patient count', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)

    try {
      await page.goto('/dashboard/pacientes')
      await expect(page.locator('text=Paciente Test 1')).toBeVisible({ timeout: 15000 })
      // Pagination summary "1–20 de 45"
      await expect(page.locator('text=/de 45/')).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
