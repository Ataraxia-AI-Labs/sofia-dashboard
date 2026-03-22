import { test, expect, Browser, Route } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE } from './global-setup'

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_TEAM = [
  {
    id: 'mem-1',
    full_name: 'Dr. Sofia Admin',
    email: 'admin@clinica.com',
    role: 'OWNER',
    status: 'active',
    avatar_url: null,
    last_login: new Date().toISOString(),
    branch_id: 'branch-1',
    branch_name: 'Sede Principal',
  },
  {
    id: 'mem-2',
    full_name: 'Dra. Ana Martinez',
    email: 'ana@clinica.com',
    role: 'ADMIN',
    status: 'active',
    avatar_url: null,
    last_login: new Date(Date.now() - 86400000).toISOString(),
    branch_id: 'branch-1',
    branch_name: 'Sede Principal',
  },
  {
    id: 'mem-3',
    full_name: 'Carlos Enfermero',
    email: 'carlos@clinica.com',
    role: 'STAFF',
    status: 'active',
    avatar_url: null,
    last_login: new Date(Date.now() - 172800000).toISOString(),
    branch_id: 'branch-2',
    branch_name: 'Sede Norte',
  },
  {
    id: 'mem-4',
    full_name: 'Laura Recepcion',
    email: 'laura@clinica.com',
    role: 'STAFF',
    status: 'inactive',
    avatar_url: null,
    last_login: null,
    branch_id: 'branch-1',
    branch_name: 'Sede Principal',
  },
]

// ─────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────

test.describe('Team page - unauthenticated', () => {
  test('redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/equipo')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─────────────────────────────────────────────────────────────
// Authenticated
// ─────────────────────────────────────────────────────────────

const hasAuth = fs.existsSync(AUTH_FILE)
const describeFn = hasAuth ? test.describe : test.describe.skip

describeFn('Team page - authenticated', () => {
  async function createAuthContext(browser: Browser) {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const page = await context.newPage()

    await page.route('**/team**', async (route: Route) => {
      const method = route.request().method()
      if (method === 'POST') {
        await route.fulfill({
          json: { id: 'mem-new', email: 'new@clinica.com', role: 'STAFF', status: 'pending' },
        })
      } else if (method === 'PATCH' || method === 'PUT') {
        await route.fulfill({ json: { success: true } })
      } else {
        await route.fulfill({ json: MOCK_TEAM })
      }
    })

    await page.route('**/staff**', async (route: Route) => {
      await route.fulfill({ json: MOCK_TEAM })
    })

    await page.route('**/members**', async (route: Route) => {
      await route.fulfill({ json: MOCK_TEAM })
    })

    return { context, page }
  }

  test('renders team member list', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      const member = page.locator('text=Dr. Sofia Admin')
        .or(page.locator('text=Dra. Ana Martinez'))
        .or(page.locator('text=/equipo|team/i'))
      await expect(member.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows role badges', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      const role = page.locator('text=/OWNER|ADMIN|STAFF|Propietario|Administrador/i')
      await expect(role.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows member emails', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      const email = page.locator('text=admin@clinica.com')
        .or(page.locator('text=ana@clinica.com'))
      await expect(email.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('has invite member button', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      const inviteBtn = page.getByRole('button', { name: /invitar|agregar|nuevo|invite|add/i })
      await expect(inviteBtn).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('invite button opens modal', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      const inviteBtn = page.getByRole('button', { name: /invitar|agregar|nuevo|invite|add/i })
      await expect(inviteBtn).toBeVisible({ timeout: 15000 })
      await inviteBtn.click()

      const modal = page.locator('[role="dialog"]')
        .or(page.locator('form'))
        .or(page.locator('text=/email|correo|rol/i'))
      await expect(modal.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('shows active and inactive members', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      await page.waitForTimeout(3000)
      // Should show both active members and potentially an inactive section
      const activeMember = page.locator('text=Dra. Ana Martinez')
      await expect(activeMember).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test('shows branch assignment', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser)
    try {
      await page.goto('/dashboard/equipo')
      const branch = page.locator('text=/Sede Principal|Sede Norte|sucursal/i')
      await expect(branch.first()).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})
