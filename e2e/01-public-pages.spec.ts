/**
 * UAT — Public pages (no auth required)
 * Regression: confirms the landing page, login, and signup all render
 * correctly and contain the expected content.
 */
import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('renders hero heading and CTA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /find & win grants/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('displays feature cards section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Everything you need to win')).toBeVisible()
    await expect(page.getByText('AI-Powered Matching')).toBeVisible()
    await expect(page.getByText('Grantor Intelligence')).toBeVisible()
    await expect(page.getByText('Strategic Calendar')).toBeVisible()
  })

  test('shows the dark CTA section at the bottom', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ready to fund your mission?')).toBeVisible()
    await expect(page.getByRole('link', { name: /find my grants/i })).toBeVisible()
  })

  test('Get Started Free links to /signup', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /get started free/i }).click()
    await expect(page).toHaveURL('/signup')
  })
})

test.describe('Login page', () => {
  test('renders form with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Supabase returns an error — any error message should appear
    await expect(page.locator('.bg-red-50, [class*="red"]')).toBeVisible({ timeout: 8_000 })
  })

  test('link to signup page works', async ({ page }) => {
    await page.goto('/login')
    await page.getByText(/get started free/i).click()
    await expect(page).toHaveURL('/signup')
  })
})

test.describe('Signup page', () => {
  test('renders create account form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('shows password mismatch error', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/email/i).fill('test@example.com')
    // Fill password fields — use locators by placeholder since both have same label type
    const pwFields = page.getByLabel(/password/i)
    await pwFields.nth(0).fill('Password123!')
    await pwFields.nth(1).fill('DifferentPass!')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('shows short password error', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/email/i).fill('test@example.com')
    const pwFields = page.getByLabel(/password/i)
    await pwFields.nth(0).fill('short')
    await pwFields.nth(1).fill('short')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })
})

test.describe('Route guarding', () => {
  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('unauthenticated user is redirected from /grants to /login', async ({ page }) => {
    await page.goto('/grants')
    await expect(page).toHaveURL('/login')
  })

  test('unauthenticated user is redirected from /calendar to /login', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page).toHaveURL('/login')
  })

  test('unknown route redirects to landing page', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page).toHaveURL('/')
  })
})
