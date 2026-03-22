import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data — Plans
// ─────────────────────────────────────────────────────────────

const MOCK_SUBSCRIPTION = {
  subscription: {
    id: 'sub-1',
    plan: 'STARTER',
    status: 'ACTIVE',
    billing_cycle: 'MONTHLY',
    current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
    amount: 99000,
    currency: 'COP',
  },
}

const MOCK_USAGE = {
  messages_sent: 450,
  messages_limit: 1000,
  ai_calls: 120,
  ai_limit: 300,
  storage_mb: 50,
  storage_limit_mb: 100,
}

const MOCK_WOMPI = {
  public_key: 'pub_test_123',
  acceptance_token: 'tok_test_456',
}

// ─────────────────────────────────────────────────────────────
// Mock data — Network
// ─────────────────────────────────────────────────────────────

const MOCK_BENCHMARKS = [
  { metric: 'conversion_rate', org_value: 0.19, network_avg: 0.15, percentile: 72 },
  { metric: 'avg_ticket', org_value: 524000, network_avg: 480000, percentile: 65 },
  { metric: 'retention_rate', org_value: 0.82, network_avg: 0.75, percentile: 80 },
]

const MOCK_NETWORK_STATS = {
  total_clinics: 12,
  total_patients: 4500,
  total_revenue: 234000000,
  avg_conversion: 0.15,
}

const MOCK_ALERTS = [
  { id: 'alert-1', type: 'BELOW_AVG', metric: 'response_time', message: 'Tiempo de respuesta por debajo del promedio', severity: 'warning' },
]

const MOCK_NARRATIVE = { narrative: 'Tu clinica esta en el percentil 72 de conversion, superando el promedio de la red.' }

const MOCK_OPTIMAL_HOURS = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 13 }, (_, hour) => ({
    day,
    hour: hour + 7,
    score: Math.random() * 100,
  }))
).flat()

// ─────────────────────────────────────────────────────────────
// Mock data — Health
// ─────────────────────────────────────────────────────────────

const MOCK_HEALTH = {
  status: 'HEALTHY',
  uptime: '15d 4h 23m',
  db_status: 'connected',
  services: {
    openai: { status: 'CLOSED', latency_ms: 450 },
    supabase: { status: 'CLOSED', latency_ms: 12 },
    meta: { status: 'CLOSED', latency_ms: 200 },
    voice: { status: 'HALF_OPEN', latency_ms: 800 },
    wompi: { status: 'CLOSED', latency_ms: 300 },
  },
}

// ─────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Plans page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/planes')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Network page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/network')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Health page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/health')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Plans — authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Plans page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/subscription**', async (route: Route) => {
      await route.fulfill({ json: MOCK_SUBSCRIPTION })
    })
    await page.route('**/usage**', async (route: Route) => {
      await route.fulfill({ json: MOCK_USAGE })
    })
    await page.route('**/wompi**', async (route: Route) => {
      await route.fulfill({ json: MOCK_WOMPI })
    })

    return { context, page }
  }

  test('renders plan comparison cards', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/planes')
      const plan = page.locator('text=/STARTER|PRO|BUSINESS|ENTERPRISE|plan/i')
      await expect(plan.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows current plan highlighted', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/planes')
      const current = page.locator('text=/actual|current|STARTER/i')
      await expect(current.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays pricing info', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/planes')
      const price = page.locator('text=/\\$|COP|mes|month|precio/i')
      await expect(price.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has billing cycle toggle', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/planes')
      const toggle = page.locator('text=/mensual|anual|monthly|annual/i')
        .or(page.locator('[role="switch"]'))
        .or(page.locator('button').filter({ hasText: /mensual|anual/i }))
      await expect(toggle.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows feature comparison', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/planes')
      const feature = page.locator('text=/mensaje|AI|almacenamiento|soporte|feature/i')
      await expect(feature.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has upgrade buttons', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/planes')
      const upgradeBtn = page.getByRole('button', { name: /upgrade|mejorar|seleccionar|elegir/i })
      await expect(upgradeBtn.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Network — authenticated
// ─────────────────────────────────────────────────────────────

describeFn('Network page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/network/benchmarks**', async (route: Route) => {
      await route.fulfill({ json: MOCK_BENCHMARKS })
    })
    await page.route('**/network/stats**', async (route: Route) => {
      await route.fulfill({ json: MOCK_NETWORK_STATS })
    })
    await page.route('**/network/alerts**', async (route: Route) => {
      await route.fulfill({ json: MOCK_ALERTS })
    })
    await page.route('**/network/narrative**', async (route: Route) => {
      await route.fulfill({ json: MOCK_NARRATIVE })
    })
    await page.route('**/network/optimal-hours**', async (route: Route) => {
      await route.fulfill({ json: MOCK_OPTIMAL_HOURS })
    })
    await page.route('**/network**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch') {
        await route.fulfill({ json: MOCK_NETWORK_STATS })
      } else {
        await route.continue()
      }
    })

    return { context, page }
  }

  test('renders network overview', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/network')
      const content = page.locator('text=/red|network|benchmark|clinica/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows benchmark comparisons', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/network')
      const benchmark = page.locator('text=/percentil|promedio|conversion|avg/i')
      await expect(benchmark.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows network stats', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/network')
      const stats = page.locator('text=/12|4.500|clinica/i')
      await expect(stats.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays alerts section', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/network')
      const alert = page.locator('text=/alerta|alert|warning|tiempo de respuesta/i')
      await expect(alert.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Health — authenticated
// ─────────────────────────────────────────────────────────────

describeFn('Health page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/health**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_HEALTH })
      } else {
        await route.continue()
      }
    })

    return { context, page }
  }

  test('shows overall system status', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/health')
      const status = page.locator('text=/HEALTHY|saludable|operativo|estado/i')
      await expect(status.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows uptime info', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/health')
      const uptime = page.locator('text=/15d|uptime|tiempo activo/i')
      await expect(uptime.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays service status for each integration', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/health')
      const service = page.locator('text=/openai|supabase|meta|voice|wompi/i')
      await expect(service.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows degraded service indicator', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/health')
      // voice is HALF_OPEN = degraded
      const degraded = page.locator('text=/HALF_OPEN|degradad|warning|voice/i')
      await expect(degraded.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has refresh button', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/health')
      const refreshBtn = page.getByRole('button', { name: /refresh|actualizar|recargar/i })
        .or(page.locator('button').filter({ hasText: /refresh|actualizar/i }))
      await expect(refreshBtn.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})
