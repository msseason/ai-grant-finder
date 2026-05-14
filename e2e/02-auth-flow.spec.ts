/**
 * UAT — Authentication flow (full login / logout cycle)
 * Regression: confirms auth state persists, protected routes work,
 * and sign-out clears the session.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Authenticated navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('authenticated user can reach the dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard|welcome/i })).toBeVisible({ timeout: 8_000 })
  })

  test('navbar shows all five nav links when logged in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Find Grants' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Applications' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
  })

  test('clicking Sign out redirects to landing page and clears session', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL('/')
    // Attempt protected route — must redirect to login now
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('active nav link gets highlighted', async ({ page }) => {
    await page.goto('/grants')
    // The active link uses bg-navy-900 text-white
    const activeLink = page.getByRole('link', { name: 'Find Grants' })
    await expect(activeLink).toHaveClass(/bg-navy-900/)
  })
})
