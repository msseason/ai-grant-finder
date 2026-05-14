/**
 * Shared helpers for E2E / UAT tests.
 * All tests run against localhost:5173 with the real Supabase backend.
 */
import { Page } from '@playwright/test'

export const TEST_EMAIL    = 'houston.ai.academy@testgrantfinder.com'
export const TEST_PASSWORD = 'HoustonAI2026!'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  ?? 'https://ycvflseyvupdgiqzkoyq.supabase.co'
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const STORAGE_KEY   = `sb-ycvflseyvupdgiqzkoyq-auth-token`

/** Sign in via Supabase REST and inject the session into browser localStorage. */
export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  // Get a session via the Supabase auth REST API
  const res  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body:    JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
  const session = await res.json()

  // Navigate to app, inject session, reload
  await page.goto('/')
  await page.evaluate(
    ([key, sess]) => localStorage.setItem(key, JSON.stringify(sess)),
    [STORAGE_KEY, session] as [string, unknown],
  )
}

/** Navigate and wait for a specific heading to appear. */
export async function gotoAndWait(page: Page, path: string, heading: string) {
  await page.goto(path)
  await page.waitForSelector(`text=${heading}`, { timeout: 10_000 })
}
