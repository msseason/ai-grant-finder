/**
 * UAT — Grant discovery (the core product feature)
 * Regression: Federal / State / Foundation tabs, eligibility filters,
 * search, live data indicator, and grant card actions all work.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Find Grants page — UAT', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto('/grants')
    // Wait for the page heading
    await page.waitForSelector('h1:has-text("Find Grants")', { timeout: 10_000 })
  })

  test('shows three scope tabs: Federal, State, Foundation', async ({ page }) => {
    await expect(page.getByRole('button', { name: /federal/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /state/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /foundation/i })).toBeVisible()
  })

  test('Federal tab is active by default', async ({ page }) => {
    const federalBtn = page.getByRole('button', { name: /federal/i })
    await expect(federalBtn).toHaveClass(/bg-navy-900/)
  })

  test('shows eligibility filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: /for-profit/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /nonprofit/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /higher education/i })).toBeVisible()
  })

  test('shows live data indicator (Wifi icon + grants.gov)', async ({ page }) => {
    // Wait for live fetch to resolve
    await expect(page.getByText(/live.*(grants|federal)/i)).toBeVisible({ timeout: 15_000 })
  })

  test('search input is present and submits on Enter', async ({ page }) => {
    const input = page.getByPlaceholder(/search by keyword/i)
    await expect(input).toBeVisible()
    await input.fill('education')
    await input.press('Enter')
    // Loader should appear then resolve
    await expect(page.getByText(/education/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('switching to Foundation tab shows ProPublica note', async ({ page }) => {
    await page.getByRole('button', { name: /foundation/i }).click()
    await expect(page.getByText(/propublica nonprofit explorer/i)).toBeVisible({ timeout: 8_000 })
  })

  test('switching to State tab shows state portal card or directory', async ({ page }) => {
    await page.getByRole('button', { name: /state/i }).click()
    // Either shows state portal card (if profile has location_state) or directory of all states
    await expect(
      page.getByText(/state grant portal|browse all/i)
    ).toBeVisible({ timeout: 8_000 })
  })

  test('Filters button toggles the extended filter panel', async ({ page }) => {
    const filtersBtn = page.getByRole('button', { name: /filters/i })
    await filtersBtn.click()
    await expect(page.getByText(/grant type/i)).toBeVisible()
    await filtersBtn.click()
    await expect(page.getByText(/grant type/i)).toBeHidden()
  })
})
