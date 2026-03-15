import { test, expect } from '@playwright/test'

/**
 * Admin Pages E2E tests
 *
 * All admin routes are protected — unauthenticated users must be redirected
 * to /login. These tests verify route protection without needing auth state.
 */

// ─────────────────────────────────────────────────────────────
// Admin routes — unauthenticated redirects
// ─────────────────────────────────────────────────────────────

const ADMIN_ROUTES = [
  '/admin',
  '/admin/health',
  '/admin/latency',
  '/admin/audit-logs',
  '/admin/api-keys',
]

test.describe('Admin pages — unauthenticated redirects', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route} redirects unauthenticated users to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
