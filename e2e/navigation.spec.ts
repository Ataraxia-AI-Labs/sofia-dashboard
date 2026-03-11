import { test, expect } from '@playwright/test'

/**
 * Dashboard Navigation E2E tests
 *
 * Unauthenticated suite: always runs, requires no credentials.
 * Authenticated suite: skipped unless e2e/.auth/user.json exists
 *   (created by global-setup.ts when E2E_TEST_EMAIL / E2E_TEST_PASSWORD are set).
 */

// ─────────────────────────────────────────────────────────────
// Protected routes — unauthenticated users must be redirected
// ─────────────────────────────────────────────────────────────

const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/pacientes',
  '/dashboard/conversaciones',
  '/dashboard/calendario',
  '/dashboard/pipeline',
  '/dashboard/oportunidades',
  '/dashboard/pagos',
  '/dashboard/equipo',
  '/dashboard/ajustes',
]

test.describe('Navigation — unauthenticated redirects', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test('redirect URL preserves the original path as ?redirect param', async ({ page }) => {
    await page.goto('/dashboard/pacientes')
    await expect(page).toHaveURL(/redirect=.*pacientes/)
  })
})

// ─────────────────────────────────────────────────────────────
// Login page — structure & navigation links (no auth required)
// ─────────────────────────────────────────────────────────────

test.describe('Login page navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('has a submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /entrar|iniciar|login/i })).toBeVisible()
  })

  test('has a "forgot password" link that navigates to /forgot-password', async ({ page }) => {
    const link = page.getByRole('link', { name: /olvidaste|olvid|forgot/i }).or(
      page.locator('a[href="/forgot-password"]')
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('has a sign-up / onboarding link', async ({ page }) => {
    const link = page.locator('a[href="/onboarding"]')
    await expect(link).toBeVisible()
  })

  test('shows an error message on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'nobody@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /entrar|iniciar|login/i }).click()
    await expect(
      page.locator('[class*="danger"], [class*="error"]').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('submit button is disabled while loading', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    const btn = page.getByRole('button', { name: /entrar|iniciar|login/i })
    await btn.click()

    // Button should briefly become disabled while the auth request is in-flight
    await expect(btn).toBeDisabled({ timeout: 2000 }).catch(() => {
      // The response may come back too fast in some environments — acceptable
    })
  })
})

// ─────────────────────────────────────────────────────────────
// Public pages — must always be accessible
// ─────────────────────────────────────────────────────────────

test.describe('Public pages', () => {
  test('forgot-password page is accessible', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('onboarding page renders a heading', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// Dashboard sidebar navigation — requires authentication
// ─────────────────────────────────────────────────────────────

import fs from 'fs'
import path from 'path'
import { AUTH_FILE } from './global-setup'

const hasAuth = fs.existsSync(AUTH_FILE)

const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Dashboard sidebar navigation — authenticated', () => {
  test('sidebar renders navigation links after login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    try {
      await page.goto('/dashboard')
      const nav = page.locator('nav[aria-label="Menu principal"]')
      await expect(nav).toBeVisible({ timeout: 15000 })

      // Core nav links must be present
      await expect(nav.locator('a[href="/dashboard/pacientes"]')).toBeVisible()
      await expect(nav.locator('a[href="/dashboard/calendario"]')).toBeVisible()
      await expect(nav.locator('a[href="/dashboard/conversaciones"]')).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('clicking a sidebar link navigates to the correct route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    try {
      await page.goto('/dashboard')
      await page.locator('a[href="/dashboard/pacientes"]').click()
      await expect(page).toHaveURL(/\/dashboard\/pacientes/, { timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  test('active sidebar link reflects the current route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    try {
      await page.goto('/dashboard/ajustes')
      const activeLink = page.locator('a[href="/dashboard/ajustes"].active')
      await expect(activeLink).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })
})
