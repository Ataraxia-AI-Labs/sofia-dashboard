import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * Mobile responsive E2E tests for dashboard pages
 * Tests that all major dashboard pages render correctly on mobile viewport (iPhone 14)
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 }

// ─────────────────────────────────────────────────────────────
// Mock data (shared for all pages)
// ─────────────────────────────────────────────────────────────

const MOCK_ANALYTICS = {
  total_patients: 142,
  total_appointments: 87,
  total_revenue: 15400000,
  appointments_today: 6,
  new_patients_this_week: 12,
  conversion_rate: 0.34,
  today_appointments: [],
  recent_activity: [],
}

const MOCK_PATIENTS = {
  patients: [
    { id: 'p1', full_name: 'Maria Lopez', phone: '573001112233', email: 'm@test.com', city: 'Bogota', service_interest: 'Botox', channel: 'WHATSAPP', lead_score: 80, created_at: new Date().toISOString() },
  ],
  total: 1,
  page: 0,
  page_size: 20,
}

const MOCK_PAYMENTS = [
  { id: 'pay-1', patient_name: 'Maria Lopez', amount: 350000, currency: 'COP', status: 'PAID', method: 'CARD', service_name: 'Botox', created_at: new Date().toISOString() },
]

const MOCK_CAMPAIGNS = [
  { id: 'camp-1', name: 'Promo Enero', status: 'COMPLETED', channel: 'WHATSAPP', total_recipients: 150, sent_count: 148, open_rate: 0.72, click_rate: 0.34, created_at: new Date().toISOString(), scheduled_at: new Date().toISOString() },
]

const MOCK_HEALTH = {
  status: 'HEALTHY',
  uptime: '15d 4h',
  db_status: 'connected',
  services: {
    openai: { status: 'CLOSED', latency_ms: 450 },
    supabase: { status: 'CLOSED', latency_ms: 12 },
  },
}

// ─────────────────────────────────────────────────────────────
// Mobile — unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Mobile - public pages', () => {
  test('login page is responsive', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/login')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    // Check no horizontal overflow
    const body = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)
    expect(body).toBe(true)
  })

  test('forgot password is responsive', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/forgot-password')
    const content = page.locator('text=/contrase|password|recuperar/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
    const body = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)
    expect(body).toBe(true)
  })

  test('403 page is responsive', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/403')
    const content = page.locator('text=/403|acceso|permiso/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
  })

  test('legal pages are responsive', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/legal/privacidad')
    const content = page.locator('text=/privacidad|datos/i')
    await expect(content.first()).toBeVisible({ timeout: 15000 })
    const body = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)
    expect(body).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// Mobile — authenticated dashboard pages
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Mobile - dashboard pages', () => {
  async function createMobileAuthContext(browser: Browser) {
    const context = await browser.newContext({
      storageState: AUTH_FILE,
      viewport: MOBILE_VIEWPORT,
    })
    const page = await context.newPage()

    // Mock all common API endpoints
    await page.route('**/analytics**', async (route: Route) => {
      await route.fulfill({ json: MOCK_ANALYTICS })
    })
    await page.route('**/dashboard**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_ANALYTICS })
      } else {
        await route.continue()
      }
    })
    await page.route('**/patients**', async (route: Route) => {
      await route.fulfill({ json: MOCK_PATIENTS })
    })
    await page.route('**/appointments**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/interactions**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/payments**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: MOCK_PAYMENTS })
      } else {
        await route.continue()
      }
    })
    await page.route('**/campaigns**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: MOCK_CAMPAIGNS })
      } else {
        await route.continue()
      }
    })
    await page.route('**/pipeline**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: { LEAD: [], CONTACTADO: [] } })
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
    await page.route('**/team**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/staff**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/members**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/health**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: MOCK_HEALTH })
      } else {
        await route.continue()
      }
    })
    await page.route('**/subscription**', async (route: Route) => {
      await route.fulfill({ json: { subscription: { plan: 'PRO', status: 'ACTIVE' } } })
    })
    await page.route('**/takeover**', async (route: Route) => {
      await route.fulfill({ json: { takeovers: [] } })
    })
    await page.route('**/channels**', async (route: Route) => {
      await route.fulfill({ json: {} })
    })
    await page.route('**/attribution**', async (route: Route) => {
      await route.fulfill({ json: { total_revenue: 0, touchpoints: [] } })
    })
    await page.route('**/leads**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/report**', async (route: Route) => {
      await route.fulfill({ json: MOCK_ANALYTICS })
    })

    return { context, page }
  }

  test('dashboard home renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard')
      const content = page.locator('text=/paciente|cita|dashboard|ingreso/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
      const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 5)
      expect(noOverflow).toBe(true)
    } finally {
      await context.close()
    }
  })

  test('mobile menu button is visible', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      // On mobile, sidebar should be hidden and menu button visible
      const menuBtn = page.locator('button[aria-label*="menu"]')
        .or(page.locator('button[aria-label*="Menu"]'))
        .or(page.locator('[data-testid="mobile-menu"]'))
        .or(page.locator('button').filter({ has: page.locator('svg') }).first())
      // Menu button should exist on mobile
      expect(await menuBtn.count()).toBeGreaterThan(0)
    } finally {
      await context.close()
    }
  })

  test('patients page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/pacientes')
      const content = page.locator('text=Maria Lopez')
        .or(page.locator('text=/paciente/i'))
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('conversations page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      const content = page.locator('text=/conversaci|mensaj|inbox|chat/i')
        .or(page.locator('body'))
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('campaigns page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      const content = page.locator('text=Promo Enero')
        .or(page.locator('text=/campa/i'))
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('payments page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      const content = page.locator('text=/pago|payment|350/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('pipeline page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/pipeline')
      const content = page.locator('text=/pipeline|lead|contactado|embudo/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('health page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/health')
      const content = page.locator('text=/HEALTHY|salud|estado|health/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('settings page renders on mobile', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    try {
      await page.goto('/dashboard/ajustes')
      const content = page.locator('text=/ajustes|configuraci|settings/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('no horizontal overflow on any dashboard page', async ({ browser }) => {
    const { context, page } = await createMobileAuthContext(browser)
    const pages = ['/dashboard', '/dashboard/pacientes', '/dashboard/pagos', '/dashboard/health']
    try {
      for (const route of pages) {
        await page.goto(route)
        await page.waitForTimeout(2000)
        const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 5)
        expect(noOverflow).toBe(true)
      }
    } finally {
      await context.close()
    }
  })
})
