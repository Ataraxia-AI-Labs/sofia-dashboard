import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

export const AUTH_FILE = path.join(__dirname, '.auth/user.json')

/**
 * Global setup for Playwright E2E tests.
 *
 * When E2E_TEST_EMAIL and E2E_TEST_PASSWORD are set, logs in once and saves
 * the browser storage state to e2e/.auth/user.json. Authenticated tests read
 * from that file so they don't have to log in on every test run.
 *
 * If the env vars are absent the file is left empty and authenticated tests
 * skip themselves via `test.skip(!hasAuth, ...)`.
 */
async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    return
  }

  const { baseURL } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${baseURL}/login`)
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.getByRole('button', { name: /entrar|iniciar|login/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 20000 })

    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    await page.context().storageState({ path: AUTH_FILE })
  } finally {
    await browser.close()
  }
}

export default globalSetup
