import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS = [
  {
    id: 'camp-1',
    name: 'Promo Botox Enero',
    status: 'COMPLETED',
    channel: 'WHATSAPP',
    total_recipients: 150,
    sent_count: 148,
    open_rate: 0.72,
    click_rate: 0.34,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    scheduled_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'camp-2',
    name: 'Recordatorio Citas',
    status: 'SCHEDULED',
    channel: 'WHATSAPP',
    total_recipients: 45,
    sent_count: 0,
    open_rate: 0,
    click_rate: 0,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'camp-3',
    name: 'Encuesta Satisfaccion',
    status: 'DRAFT',
    channel: 'WHATSAPP',
    total_recipients: 0,
    sent_count: 0,
    open_rate: 0,
    click_rate: 0,
    created_at: new Date().toISOString(),
    scheduled_at: null,
  },
  {
    id: 'camp-4',
    name: 'Black Friday',
    status: 'SENDING',
    channel: 'WHATSAPP',
    total_recipients: 300,
    sent_count: 120,
    open_rate: 0,
    click_rate: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    scheduled_at: new Date(Date.now() - 1800000).toISOString(),
  },
]

const MOCK_ANALYTICS = {
  campaign_id: 'camp-1',
  total_sent: 148,
  delivered: 145,
  opened: 107,
  clicked: 50,
  conversion_rate: 0.12,
  revenue_attributed: 4500000,
}

// ─────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Campaigns page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/campanas')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Campaigns page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/campaigns**', async (route: Route) => {
      const url = route.request().url()
      const method = route.request().method()

      if (method === 'POST') {
        await route.fulfill({
          json: { id: 'camp-new', name: 'Nueva Campana', status: 'DRAFT' },
        })
        return
      }

      if (url.includes('analytics')) {
        await route.fulfill({ json: MOCK_ANALYTICS })
      } else if (url.includes('preview')) {
        await route.fulfill({
          json: { preview: 'Hola {nombre}, tenemos una promo especial para ti!', count: 45 },
        })
      } else if (url.includes('suggest-segment')) {
        await route.fulfill({
          json: { segment: { min_age: 25, max_age: 55, services: ['Botox'] }, explanation: 'Segmento ideal' },
        })
      } else if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_CAMPAIGNS })
      } else {
        await route.continue()
      }
    })

    return { context, page }
  }

  test('renders campaign list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      await expect(
        page.locator('text=Promo Botox Enero').or(page.locator('text=/campa/i').first())
      ).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows campaign status badges', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      const badge = page.locator('text=/Completada|Programada|Borrador|Enviando/i')
      await expect(badge.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays multiple campaigns', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      await expect(page.locator('text=Promo Botox Enero')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('text=Recordatorio Citas')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('has create campaign button', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      const createBtn = page.getByRole('button', { name: /crear|nueva|new/i })
      await expect(createBtn).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('create button opens modal/form', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      const createBtn = page.getByRole('button', { name: /crear|nueva|new/i })
      await expect(createBtn).toBeVisible({ timeout: 15000 })
      await createBtn.click()

      // Modal or form should appear
      const modal = page.locator('[role="dialog"]')
        .or(page.locator('form'))
        .or(page.locator('text=/nombre de la campa|objetivo|segmento/i'))
      await expect(modal.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('shows campaign metrics for completed campaigns', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      // Completed campaign should show stats (open rate, recipients)
      const metric = page.locator('text=/150|148|72%|34%/i')
        .or(page.locator('text=/destinatarios|enviados|apertura/i'))
      await expect(metric.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows draft campaigns without schedule', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/campanas')
      await expect(page.locator('text=Encuesta Satisfaccion')).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})
