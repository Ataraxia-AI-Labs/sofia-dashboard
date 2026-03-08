import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar|login|entrar/i })).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /iniciar|login|entrar/i }).click()
    await expect(page.locator('text=/error|invalid|incorrec/i')).toBeVisible({ timeout: 10000 })
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })

  test('onboarding page is accessible', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('Landing pages', () => {
  test('404 page renders correctly', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await expect(page.locator('text=/404|no encontr/i')).toBeVisible()
  })
})
