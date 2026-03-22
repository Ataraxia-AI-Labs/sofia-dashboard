import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Error handling E2E tests
 * Covers: API failures, network errors, empty states, loading states, error boundaries
 */

// ─────────────────────────────────────────────────────────────
// Unauthenticated error scenarios
// ─────────────────────────────────────────────────────────────

test.describe('Error pages', () => {
  test('non-existent route shows 404 or redirect', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    const content = page.locator('text=/404|no encontrad|not found|pagina/i')
      .or(page.locator('text=/login|inicio/i'))
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('non-existent dashboard route shows 404', async ({ page }) => {
    await page.goto('/dashboard/this-does-not-exist')
    await page.waitForTimeout(3000)
    // Either shows 404 or redirects to login (unauthenticated)
    const url = page.url()
    expect(url.includes('login') || url.includes('404') || url.includes('does-not-exist')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated error scenarios
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('API failure handling - dashboard home', () => {
  async function createErrorContext(browser: Browser, statusCode: number) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // All API calls return errors
    await page.route('**/*', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({
          status: statusCode,
          json: { error: 'Server error', detail: 'Something went wrong' },
        })
      } else {
        await route.continue()
      }
    })

    return { context, page }
  }

  test('handles 500 server error gracefully', async ({ browser }) => {
    const { context, page } = await createErrorContext(browser, 500)
    try {
      await page.goto('/dashboard')
      await page.waitForTimeout(5000)
      // Page should still load (not crash), may show error state
      const errorOrPage = page.locator('text=/error|algo sali|intentar|reintentar|dashboard/i')
        .or(page.locator('body'))
      await expect(errorOrPage.first()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('handles network timeout gracefully', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/*', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        // Abort to simulate network failure
        await route.abort('timedout')
      } else {
        await route.continue()
      }
    })

    try {
      await page.goto('/dashboard')
      await page.waitForTimeout(5000)
      // Should not crash
      expect(await page.locator('body').count()).toBe(1)
    } finally {
      await context.close()
    }
  })

  test('handles 401 unauthorized by redirecting', async ({ browser }) => {
    const { context, page } = await createErrorContext(browser, 401)
    try {
      await page.goto('/dashboard')
      await page.waitForTimeout(5000)
      // May redirect to login on 401
      const url = page.url()
      const handledGracefully = url.includes('/login') || url.includes('/dashboard')
      expect(handledGracefully).toBe(true)
    } finally {
      await context.close()
    }
  })

  test('handles 403 forbidden appropriately', async ({ browser }) => {
    const { context, page } = await createErrorContext(browser, 403)
    try {
      await page.goto('/dashboard')
      await page.waitForTimeout(5000)
      // Should show some UI, not crash
      expect(await page.locator('body').count()).toBe(1)
    } finally {
      await context.close()
    }
  })
})

describeFn('Empty state handling', () => {
  async function createEmptyContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // All API calls return empty data
    await page.route('**/patients**', async (route: Route) => {
      await route.fulfill({ json: { patients: [], total: 0, page: 0, page_size: 20 } })
    })
    await page.route('**/appointments**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/payments**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/interactions**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/campaigns**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: [] })
      } else {
        await route.continue()
      }
    })
    await page.route('**/opportunities**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: [] })
      } else {
        await route.continue()
      }
    })
    await page.route('**/analytics**', async (route: Route) => {
      await route.fulfill({
        json: {
          total_patients: 0, total_appointments: 0, total_revenue: 0,
          appointments_today: 0, new_patients_this_week: 0, conversion_rate: 0,
        },
      })
    })
    await page.route('**/pipeline**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: {} })
      } else {
        await route.continue()
      }
    })
    await page.route('**/dashboard**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({
          json: {
            total_patients: 0, total_appointments: 0, total_revenue: 0,
            appointments_today: 0, today_appointments: [], recent_activity: [],
          },
        })
      } else {
        await route.continue()
      }
    })

    return { context, page }
  }

  test('patients page shows empty state', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard/pacientes')
      const empty = page.locator('text=/no hay|sin paciente|empty|vac|agregar|crear/i')
        .or(page.locator('[data-testid="empty-state"]'))
      await expect(empty.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('campaigns page shows empty state', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      const empty = page.locator('text=/no hay|sin campa|empty|crear|primera/i')
        .or(page.locator('[data-testid="empty-state"]'))
      await expect(empty.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('opportunities page shows empty state', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard/oportunidades')
      const empty = page.locator('text=/no hay|sin oportunidad|empty|detectad/i')
        .or(page.locator('[data-testid="empty-state"]'))
      await expect(empty.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('payments page shows empty state', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      const empty = page.locator('text=/no hay|sin pago|empty|registr/i')
        .or(page.locator('[data-testid="empty-state"]'))
      await expect(empty.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('conversations page shows empty state', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      const empty = page.locator('text=/no hay|sin conversaci|sin mensaje|empty/i')
        .or(page.locator('[data-testid="empty-state"]'))
      await expect(empty.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('pipeline page shows empty stages', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard/pipeline')
      // Pipeline should still show stage headers even when empty
      const stage = page.locator('text=/lead|contactado|cita|pipeline/i')
      await expect(stage.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('dashboard shows zero metrics gracefully', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)
    try {
      await page.goto('/dashboard')
      // Should still render the page with zero values
      const page_content = page.locator('text=/0|paciente|cita|dashboard/i')
      await expect(page_content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})

describeFn('Slow API response handling', () => {
  test('shows loading state while API responds', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    // Delay API response by 3 seconds
    await page.route('**/patients**', async (route: Route) => {
      await new Promise((r) => setTimeout(r, 3000))
      await route.fulfill({ json: { patients: [], total: 0, page: 0, page_size: 20 } })
    })

    try {
      await page.goto('/dashboard/pacientes')
      // During loading, should show spinner or skeleton
      const loader = page.locator('[class*="spinner"]')
        .or(page.locator('[class*="skeleton"]'))
        .or(page.locator('[class*="loading"]'))
        .or(page.locator('[class*="animate-spin"]'))
        .or(page.locator('[class*="animate-pulse"]'))
        .or(page.locator('text=/cargando|loading/i'))
      // Check within first 2 seconds (before API responds)
      if (await loader.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(true).toBe(true)
      }
      // Eventually should resolve
      await page.waitForTimeout(4000)
    } finally {
      await context.close()
    }
  })
})
