import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data — Reports
// ─────────────────────────────────────────────────────────────

const MOCK_ANALYTICS = {
  conversiones: {
    total_conversations: 450,
    total_appointments_booked: 87,
    conversion_rate: 0.193,
    avg_messages_to_convert: 4.2,
  },
  revenue: {
    total_revenue: 45600000,
    avg_ticket: 524137,
    payment_count: 87,
    pending_amount: 3200000,
  },
  performance_ia: {
    total_ai_responses: 1250,
    avg_confidence: 0.87,
    fallback_rate: 0.05,
    avg_response_time_ms: 1200,
  },
  sub_bots: {
    appointment_bot: { calls: 120, success_rate: 0.92 },
    payment_bot: { calls: 45, success_rate: 0.88 },
    faq_bot: { calls: 380, success_rate: 0.95 },
  },
}

// ─────────────────────────────────────────────────────────────
// Mock data — Data Lake
// ─────────────────────────────────────────────────────────────

const MOCK_DATALAKE_STATS = {
  total_rows: 125000,
  total_tables: 45,
  total_columns: 380,
  storage_mb: 256,
}

const MOCK_DAILY = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
  rows_ingested: 3000 + Math.floor(Math.random() * 2000),
  tables_updated: 12 + Math.floor(Math.random() * 8),
}))

const MOCK_TRAINING_READY = { count: 8500 }

// ─────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Reports page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/reportes')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Data Lake page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/datalake')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Reports — authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Reports page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/analytics**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_ANALYTICS })
      } else {
        await route.continue()
      }
    })

    await page.route('**/report**', async (route: Route) => {
      if (route.request().url().includes('pdf')) {
        await route.fulfill({
          body: Buffer.from('fake-pdf-content'),
          headers: { 'Content-Type': 'application/pdf' },
        })
      } else {
        await route.fulfill({ json: MOCK_ANALYTICS })
      }
    })

    return { context, page }
  }

  test('renders analytics overview', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/reportes')
      const content = page.locator('text=/reporte|analytic|conversiones|revenue/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows conversion metrics', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/reportes')
      const metric = page.locator('text=/450|87|19|conversi/i')
      await expect(metric.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows revenue metrics', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/reportes')
      const revenue = page.locator('text=/ingreso|revenue|45.600|pago/i')
      await expect(revenue.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows AI performance section', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/reportes')
      const ai = page.locator('text=/IA|inteligencia|confidence|rendimiento/i')
      await expect(ai.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has days selector', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/reportes')
      const selector = page.locator('text=/7 d|15 d|30 d|60 d|90 d/i')
        .or(page.locator('select'))
        .or(page.locator('[role="combobox"]'))
      await expect(selector.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has download PDF button', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/reportes')
      const downloadBtn = page.getByRole('button', { name: /descargar|download|pdf|exportar/i })
        .or(page.locator('text=/descargar|PDF/i'))
      await expect(downloadBtn.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Data Lake — authenticated
// ─────────────────────────────────────────────────────────────

describeFn('Data Lake page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/data-lake/stats**', async (route: Route) => {
      await route.fulfill({ json: MOCK_DATALAKE_STATS })
    })

    await page.route('**/data-lake/daily**', async (route: Route) => {
      await route.fulfill({ json: MOCK_DAILY })
    })

    await page.route('**/data-lake**', async (route: Route) => {
      if (route.request().url().includes('training-ready')) {
        await route.fulfill({ json: MOCK_TRAINING_READY })
      } else if (route.request().url().includes('export')) {
        await route.fulfill({
          body: Buffer.from('{"data":"sample"}\n'),
          headers: { 'Content-Type': 'application/jsonl' },
        })
      } else if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: MOCK_DATALAKE_STATS })
      } else {
        await route.continue()
      }
    })

    await page.route('**/models**', async (route: Route) => {
      await route.fulfill({ json: [] })
    })

    await page.route('**/training**', async (route: Route) => {
      await route.fulfill({ json: MOCK_TRAINING_READY })
    })

    return { context, page }
  }

  test('renders data lake overview', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/datalake')
      const content = page.locator('text=/data lake|datos|almacen/i')
        .or(page.locator('text=/125|45|380/'))
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows storage stats', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/datalake')
      const stats = page.locator('text=/125|256|tabla|fila|row/i')
      await expect(stats.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows training-ready count', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/datalake')
      const training = page.locator('text=/8.500|entrenamiento|training|listo/i')
      await expect(training.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has tab navigation', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/datalake')
      const tab = page.locator('[role="tab"]')
        .or(page.locator('button').filter({ hasText: /overview|export|model|optim|learning/i }))
      await expect(tab.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})
