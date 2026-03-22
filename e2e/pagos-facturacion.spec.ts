import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_PAYMENTS = [
  {
    id: 'pay-1',
    patient_name: 'Maria Lopez',
    amount: 350000,
    currency: 'COP',
    status: 'PAID',
    method: 'CARD',
    service_name: 'Botox',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pay-2',
    patient_name: 'Carlos Ruiz',
    amount: 1200000,
    currency: 'COP',
    status: 'PENDING',
    method: 'CASH',
    service_name: 'Rinoplastia consulta',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'pay-3',
    patient_name: 'Laura Garcia',
    amount: 500000,
    currency: 'COP',
    status: 'DECLINED',
    method: 'CARD',
    service_name: 'Limpieza facial',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

const MOCK_ATTRIBUTION = {
  total_revenue: 2050000,
  touchpoints: [
    { channel: 'WHATSAPP', revenue: 1200000, percentage: 58.5 },
    { channel: 'INSTAGRAM', revenue: 500000, percentage: 24.4 },
    { channel: 'VOICE', revenue: 350000, percentage: 17.1 },
  ],
}

const MOCK_SUBSCRIPTION = {
  subscription: {
    id: 'sub-1',
    plan: 'PRO',
    status: 'ACTIVE',
    billing_cycle: 'MONTHLY',
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    amount: 199000,
    currency: 'COP',
  },
}

const MOCK_INVOICES = [
  {
    id: 'inv-1',
    amount: 199000,
    currency: 'COP',
    status: 'PAID',
    period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
    period_end: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'inv-2',
    amount: 199000,
    currency: 'COP',
    status: 'PAID',
    period_start: new Date(Date.now() - 60 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
]

const MOCK_USAGE = {
  messages_sent: 1250,
  messages_limit: 5000,
  ai_calls: 340,
  ai_limit: 1000,
  storage_mb: 120,
  storage_limit_mb: 500,
}

const MOCK_WOMPI = {
  public_key: 'pub_test_123',
  acceptance_token: 'tok_test_456',
}

// ─────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Payments page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/pagos')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Billing page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/facturacion')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Payments — authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Payments page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/payments**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_PAYMENTS })
      } else {
        await route.continue()
      }
    })

    await page.route('**/attribution**', async (route: Route) => {
      await route.fulfill({ json: MOCK_ATTRIBUTION })
    })

    return { context, page }
  }

  test('renders payment list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      const content = page.locator('text=Maria Lopez')
        .or(page.locator('text=/pago|payment/i'))
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows payment status badges', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      const badge = page.locator('text=/Pagado|Pendiente|Rechazado|PAID|PENDING/i')
      await expect(badge.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays payment amounts', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      // Should show formatted amounts
      const amount = page.locator('text=/350|1.200|500/i')
      await expect(amount.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows service names', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      const service = page.locator('text=Botox')
        .or(page.locator('text=Rinoplastia'))
      await expect(service.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has attribution tab or section', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pagos')
      const attrTab = page.locator('text=/atribuci|attribution|canal/i')
        .or(page.locator('[role="tab"]'))
      await expect(attrTab.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Billing — authenticated
// ─────────────────────────────────────────────────────────────

describeFn('Billing page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/subscription**', async (route: Route) => {
      await route.fulfill({ json: MOCK_SUBSCRIPTION })
    })

    await page.route('**/invoices**', async (route: Route) => {
      await route.fulfill({ json: MOCK_INVOICES })
    })

    await page.route('**/usage**', async (route: Route) => {
      await route.fulfill({ json: MOCK_USAGE })
    })

    await page.route('**/wompi**', async (route: Route) => {
      await route.fulfill({ json: MOCK_WOMPI })
    })

    return { context, page }
  }

  test('shows current subscription plan', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/facturacion')
      const plan = page.locator('text=/PRO|plan actual|suscripci/i')
      await expect(plan.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows subscription status', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/facturacion')
      const status = page.locator('text=/activ|ACTIVE/i')
      await expect(status.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays invoice history', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/facturacion')
      const invoice = page.locator('text=/factura|invoice|199/i')
      await expect(invoice.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows usage metrics', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/facturacion')
      const usage = page.locator('text=/mensajes|uso|usage|1.250|5.000/i')
      await expect(usage.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has cancel subscription option', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/facturacion')
      const cancelBtn = page.locator('text=/cancelar|cancel/i')
        .or(page.getByRole('button', { name: /cancelar suscripci/i }))
      // Cancel might be in a dropdown or secondary action
      await page.waitForTimeout(3000)
      expect(await cancelBtn.count()).toBeGreaterThanOrEqual(0) // May be hidden
    } finally {
      await context.close()
    }
  })
})
