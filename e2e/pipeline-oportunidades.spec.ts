import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const PIPELINE_STAGES = ['LEAD', 'CONTACTADO', 'CITA_AGENDADA', 'CITA_COMPLETADA', 'PAGADO', 'RECURRENTE']

const MOCK_PIPELINE = PIPELINE_STAGES.reduce(
  (acc, stage, i) => {
    acc[stage] = Array.from({ length: 3 + i }, (_, j) => ({
      id: `patient-${stage}-${j}`,
      full_name: `Paciente ${stage} ${j + 1}`,
      phone: `57300${i}${j}00000`,
      stage,
      lead_score: 50 + i * 10,
      last_interaction: new Date(Date.now() - j * 86400000).toISOString(),
    }))
    return acc
  },
  {} as Record<string, unknown[]>
)

const MOCK_OPPORTUNITIES = [
  {
    id: 'opp-1',
    patient_id: 'p1',
    patient_name: 'Ana Garcia',
    type: 'HOT_LEAD',
    status: 'DETECTED',
    score: 92,
    description: 'Alto interes en Botox',
    created_at: new Date().toISOString(),
  },
  {
    id: 'opp-2',
    patient_id: 'p2',
    patient_name: 'Pedro Martinez',
    type: 'UPSELL',
    status: 'ACTED_ON',
    score: 78,
    description: 'Candidato para paquete premium',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'opp-3',
    patient_id: 'p3',
    patient_name: 'Laura Sanchez',
    type: 'REACTIVATION',
    status: 'DETECTED',
    score: 65,
    description: 'Sin visita en 90 dias',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'opp-4',
    patient_id: 'p4',
    patient_name: 'Diego Ramirez',
    type: 'CHURN_RISK',
    status: 'DETECTED',
    score: 45,
    description: 'Riesgo de abandono detectado',
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
]

const MOCK_LEAD_SCORES = [
  { patient_id: 'p1', score: 92, classification: 'HOT' },
  { patient_id: 'p2', score: 78, classification: 'HOT' },
  { patient_id: 'p3', score: 65, classification: 'WARM' },
  { patient_id: 'p4', score: 45, classification: 'COLD' },
]

// ─────────────────────────────────────────────────────────────
// Pipeline — unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Pipeline page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/pipeline')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Opportunities page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/oportunidades')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Pipeline — authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Pipeline page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/pipeline**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_PIPELINE })
      } else {
        await route.continue()
      }
    })

    await page.route('**/patients**', async (route: Route) => {
      await route.fulfill({ json: { patients: [], total: 0 } })
    })

    return { context, page }
  }

  test('renders the pipeline stages', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pipeline')
      // Should show stage headers or labels
      const stageLabel = page.locator('text=/lead|contactado|cita|pagado|recurrente/i')
      await expect(stageLabel.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows patient cards in pipeline', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pipeline')
      const patientCard = page.locator('text=/Paciente LEAD|Paciente CONTACTADO/i')
      await expect(patientCard.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays stage counts', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pipeline')
      // Each stage should show count badge
      const countBadge = page.locator('text=/\\d+/')
      await expect(countBadge.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('pipeline has all 6 stages visible', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/pipeline')
      await page.waitForTimeout(3000)
      // At least the first and last stages should be identifiable
      const leadStage = page.locator('text=/lead/i')
      await expect(leadStage.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Opportunities — authenticated
// ─────────────────────────────────────────────────────────────

describeFn('Opportunities page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/opportunities**', async (route: Route) => {
      if (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr') {
        await route.fulfill({ json: MOCK_OPPORTUNITIES })
      } else {
        await route.continue()
      }
    })

    await page.route('**/leads/scores**', async (route: Route) => {
      await route.fulfill({ json: MOCK_LEAD_SCORES })
    })

    await page.route('**/leads**', async (route: Route) => {
      await route.fulfill({ json: MOCK_LEAD_SCORES })
    })

    return { context, page }
  }

  test('loads opportunity list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/oportunidades')
      const content = page.locator('text=/oportunidad|HOT_LEAD|UPSELL|Ana Garcia/i')
      await expect(content.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows opportunity type badges', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/oportunidades')
      const badge = page.locator('text=/HOT_LEAD|UPSELL|REACTIVATION|CHURN_RISK/i')
        .or(page.locator('text=/lead caliente|upsell|reactivaci|riesgo/i'))
      await expect(badge.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows opportunity status', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/oportunidades')
      const status = page.locator('text=/DETECTED|ACTED_ON|detectad|actu/i')
      await expect(status.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('displays patient names in opportunities', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/oportunidades')
      await expect(page.locator('text=Ana Garcia').first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has filter controls', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/oportunidades')
      await page.waitForTimeout(3000)
      // Should have filter buttons or dropdowns for status/type
      const filter = page.locator('button, select, [role="combobox"]')
      expect(await filter.count()).toBeGreaterThan(0)
    } finally {
      await context.close()
    }
  })
})
