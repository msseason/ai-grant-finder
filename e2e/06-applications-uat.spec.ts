/**
 * UAT — Applications tracker
 * Regression: page loads, empty state shown, Add form opens,
 * status filters work, pipeline stats render.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Applications page — UAT', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto('/applications')
    await page.waitForSelector('h1:has-text("Applications")', { timeout: 8_000 })
  })

  test('renders heading and Track Application button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /applications/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /track application/i })).toBeVisible()
  })

  test('shows pipeline stats row', async ({ page }) => {
    await expect(page.getByText('Total')).toBeVisible()
    await expect(page.getByText('Pipeline')).toBeVisible()
    await expect(page.getByText('Awarded')).toBeVisible()
    await expect(page.getByText('Success Rate')).toBeVisible()
  })

  test('shows status filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^all/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /draft/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /submitted/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /under review/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /awarded/i })).toBeVisible()
  })

  test('Track Application button opens the add form', async ({ page }) => {
    await page.getByRole('button', { name: /track application/i }).click()
    await expect(page.getByRole('heading', { name: /track new application/i })).toBeVisible()
    await expect(page.getByLabel(/grant name/i)).toBeVisible()
    await expect(page.getByLabel(/status/i)).toBeVisible()
    await expect(page.getByLabel(/amount requested/i)).toBeVisible()
  })

  test('Cancel closes the form', async ({ page }) => {
    await page.getByRole('button', { name: /track application/i }).click()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('heading', { name: /track new application/i })).toBeHidden()
  })

  test('form requires Grant Name before submission', async ({ page }) => {
    await page.getByRole('button', { name: /track application/i }).click()
    await page.getByRole('button', { name: /add application/i }).click()
    // Should remain open due to required field validation
    await expect(page.getByRole('heading', { name: /track new application/i })).toBeVisible()
  })

  test('empty or populated state renders without error', async ({ page }) => {
    const hasEmpty = await page.getByText(/no applications tracked yet/i).isVisible()
    const hasRows  = await page.locator('[class*="card"]').first().isVisible()
    expect(hasEmpty || hasRows).toBe(true)
  })
})
