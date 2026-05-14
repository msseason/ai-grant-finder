/**
 * UAT — Profile page
 * Regression: all form fields render, Year Founded field present,
 * eligibility age warning logic, Notification Settings section visible.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Profile page — UAT', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto('/profile')
    await page.waitForSelector('h1:has-text("Organization Profile")', { timeout: 8_000 })
  })

  test('renders all core profile fields', async ({ page }) => {
    await expect(page.getByLabel(/organization name/i)).toBeVisible()
    await expect(page.getByLabel(/organization type/i)).toBeVisible()
    await expect(page.getByLabel(/city/i)).toBeVisible()
    await expect(page.getByLabel(/state/i)).toBeVisible()
    await expect(page.getByLabel(/annual budget/i)).toBeVisible()
    await expect(page.getByLabel(/year founded/i)).toBeVisible()
  })

  test('shows eligibility age warning for very new org (founded this year)', async ({ page }) => {
    const currentYear = new Date().getFullYear()
    await page.getByLabel(/year founded/i).fill(String(currentYear))
    // Trigger blur to update state
    await page.getByLabel(/organization name/i).click()
    await expect(page.getByText(/under 1 year old|ineligible for most federal/i)).toBeVisible()
  })

  test('no age warning for established org', async ({ page }) => {
    await page.getByLabel(/year founded/i).fill('2019')
    await page.getByLabel(/organization name/i).click()
    await expect(page.getByText(/under 1 year old|under 2 years/i)).toBeHidden()
  })

  test('Save Profile button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save profile|save & find grants/i })).toBeVisible()
  })

  test('Email Notifications section renders for established profile', async ({ page }) => {
    await expect(page.getByText(/email notifications/i).first()).toBeVisible()
    await expect(page.getByText(/weekly grant digest/i)).toBeVisible()
    await expect(page.getByText(/new opportunities/i)).toBeVisible()
    await expect(page.getByText(/deadline reminders/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send test email/i })).toBeVisible()
  })

  test('deadline reminder day pills all render', async ({ page }) => {
    for (const days of ['60 days', '30 days', '14 days', '7 days', '3 days', '1 day']) {
      await expect(page.getByRole('button', { name: new RegExp(days, 'i') })).toBeVisible()
    }
  })

  test('notification master toggle changes label', async ({ page }) => {
    // Find the master Email Notifications toggle
    const toggle = page.getByRole('switch').first()
    const initialChecked = await toggle.getAttribute('aria-checked')
    await toggle.click()
    const newChecked = await toggle.getAttribute('aria-checked')
    expect(newChecked).not.toBe(initialChecked)
  })

  test('Sectors tag input accepts free-text', async ({ page }) => {
    await page.getByPlaceholder(/type a sector/i).fill('Quantum Computing')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Quantum Computing')).toBeVisible()
  })
})
