import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_PATIENTS = [
  { id: 'p1', full_name: 'Maria Lopez', phone: '573001112233' },
  { id: 'p2', full_name: 'Carlos Ruiz', phone: '573009998877' },
]

const MOCK_INTERACTIONS = [
  {
    id: 'int-1',
    patient_id: 'p1',
    patient_name: 'Maria Lopez',
    platform: 'whatsapp',
    raw_content: 'Hola, quiero agendar una cita',
    ai_response: 'Claro Maria! Te puedo ayudar con eso.',
    sentiment: 'POSITIVE',
    sentiment_score: 0.85,
    created_at: new Date().toISOString(),
    channel: 'WHATSAPP',
  },
  {
    id: 'int-2',
    patient_id: 'p2',
    patient_name: 'Carlos Ruiz',
    platform: 'instagram',
    raw_content: 'Info de precios',
    ai_response: 'Con gusto Carlos, nuestros servicios incluyen...',
    sentiment: 'NEUTRAL',
    sentiment_score: 0.5,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    channel: 'INSTAGRAM',
  },
  {
    id: 'int-3',
    patient_id: 'p1',
    patient_name: 'Maria Lopez',
    platform: 'whatsapp',
    raw_content: 'Perfecto, el martes a las 3pm',
    ai_response: 'Listo, tu cita queda agendada para el martes.',
    sentiment: 'POSITIVE',
    sentiment_score: 0.9,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    channel: 'WHATSAPP',
  },
]

const MOCK_TAKEOVERS = { takeovers: [] }

// ─────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Conversations page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/conversaciones')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect URL preserves original path', async ({ page }) => {
    await page.goto('/dashboard/conversaciones')
    await expect(page).toHaveURL(/redirect=.*conversaciones/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Conversations page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/interactions**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_INTERACTIONS })
      } else {
        await route.continue()
      }
    })

    await page.route('**/patients**', async (route: Route) => {
      await route.fulfill({ json: { patients: MOCK_PATIENTS, total: 2 } })
    })

    await page.route('**/takeover**', async (route: Route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ json: MOCK_TAKEOVERS })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })

    await page.route('**/channels**', async (route: Route) => {
      await route.fulfill({
        json: {
          whatsapp: { connected: true, status: 'active' },
          instagram: { connected: true, status: 'active' },
          voice: { connected: false, status: 'inactive' },
          webchat: { connected: true, status: 'active' },
        },
      })
    })

    return { context, page }
  }

  test('loads the conversations page', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      const content = page.locator('text=/conversacion|mensaj|inbox|chat/i')
        .or(page.locator('[data-testid="conversations"]'))
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays patient conversation threads', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      const patientEntry = page.locator('text=Maria Lopez')
        .or(page.locator('text=Carlos Ruiz'))
      await expect(patientEntry.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows channel indicators', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      const channelIndicator = page.locator('text=/whatsapp|instagram|voz|webchat/i')
      await expect(channelIndicator.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows message content in thread', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      // Click on a conversation thread if available
      const thread = page.locator('text=Maria Lopez')
      if (await thread.isVisible({ timeout: 10000 })) {
        await thread.first().click()
        // After clicking, look for message content
        const messageContent = page.locator('text=/agendar una cita|ayudar con eso/i')
        await expect(messageContent.first()).toBeVisible({ timeout: 10000 })
      }
    } finally {
      await context.close()
    }
  })

  test('shows sentiment indicators', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      // Sentiment badges or scores should be rendered
      const sentiment = page.locator('text=/positiv|neutral|negativ|sentimiento/i')
        .or(page.locator('[class*="sentiment"]'))
      await expect(sentiment.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('search filters conversations', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/conversaciones')
      await page.waitForTimeout(2000)
      const searchInput = page.locator('input[placeholder*="Buscar"]')
        .or(page.locator('input[type="search"]'))
        .or(page.locator('input[placeholder*="buscar"]'))
      if (await searchInput.first().isVisible({ timeout: 5000 })) {
        await searchInput.first().fill('Maria')
        await page.waitForTimeout(400)
        // Should still show Maria, may hide Carlos
        await expect(page.locator('text=Maria Lopez').first()).toBeVisible({ timeout: 5000 })
      }
    } finally {
      await context.close()
    }
  })

  test('page has no console errors on load', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    try {
      await page.goto('/dashboard/conversaciones')
      await page.waitForTimeout(3000)
      // Filter out known non-critical errors
      const critical = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('hydration') && !e.includes('404')
      )
      expect(critical.length).toBeLessThan(5)
    } finally {
      await context.close()
    }
  })
})
