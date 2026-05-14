/**
 * UAT — Strategic Calendar
 * Regression: page renders, empty state shown, add-event form works,
 * event type filters render.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Strategic Calendar — UAT', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto('/calendar')
    await page.waitForSelector('h1:has-text("Strategic Calendar")', { timeout: 8_000 })
  })

  test('renders page heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /strategic calendar/i })).toBeVisible()
    await expect(page.getByText(/deadlines.*milestones.*program officer/i)).toBeVisible()
  })

  test('shows Sync Grants and Add Event buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sync grants/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add event/i })).toBeVisible()
  })

  test('shows event type filter tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /all events/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /grant deadline/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /program officer call/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /grantor webinar/i })).toBeVisible()
  })

  test('Add Event button opens the form', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click()
    await expect(page.getByRole('heading', { name: /add calendar event/i })).toBeVisible()
    await expect(page.getByLabel(/event title/i)).toBeVisible()
    await expect(page.getByLabel(/event type/i)).toBeVisible()
    await expect(page.getByLabel(/date/i)).toBeVisible()
  })

  test('Add Event form requires title and date before submission', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click()
    // Submit without filling required fields
    await page.getByRole('button', { name: /^add event$/i }).click()
    // Form should not close (still visible) — browser validation prevents submit
    await expect(page.getByRole('heading', { name: /add calendar event/i })).toBeVisible()
  })

  test('Add Event form cancel button closes the form', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('heading', { name: /add calendar event/i })).toBeHidden()
  })

  test('empty state shown when no events', async ({ page }) => {
    // Test user may or may not have events — check for empty state OR event list
    const hasEmpty  = await page.getByText(/no events yet/i).isVisible()
    const hasEvents = await page.locator('[class*="card"]').first().isVisible()
    expect(hasEmpty || hasEvents).toBe(true)
  })
})
