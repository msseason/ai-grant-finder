/**
 * Tests for src/pages/Profile.tsx
 *  - Year Founded field
 *  - Age warning logic
 *  - NotificationSettings visibility
 *  - Notification preference controls
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Supabase mock ─────────────────────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: 'uuid-1' }, error: null }),
    })),
  },
}))

// ── react-router-dom mock ─────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
  useLocation: vi.fn().mockReturnValue({ pathname: '/profile' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}))

// ── useAuth mock — we'll override per test ────────────────────────────────────
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

// ── fetch mock (for SendTestEmail) ────────────────────────────────────────────
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ results: [] }),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

import Profile from '../pages/Profile'

const EXISTING_PROFILE = {
  id: 'p1', user_id: 'user-1', org_name: 'Test Org',
  org_type: 'for-profit' as const, description: 'We do AI training.',
  industries: ['AI Education'], location_state: 'TX',
  location_city: 'Houston', annual_budget: 0, employee_count: 3,
  website: null, ein: null, founded_year: 2015,
  mission: null, created_at: '2020-01-01', updated_at: '2020-01-01',
}

function renderProfileWithExistingProfile(overrides: Partial<typeof EXISTING_PROFILE> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', email: 'test@test.com' },
    session: { access_token: 'tok' },
    profile: { ...EXISTING_PROFILE, ...overrides },
    loading: false,
    signOut: vi.fn(),
    setProfile: vi.fn(),
  })
  return render(<Profile />)
}

function renderProfileSetup() {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', email: 'test@test.com' },
    session: { access_token: 'tok' },
    profile: null,  // no profile = setup mode
    loading: false,
    signOut: vi.fn(),
    setProfile: vi.fn(),
  })
  return render(<Profile />)
}

// ── Year Founded field ────────────────────────────────────────────────────────

describe('Profile page — Year Founded field', () => {
  it('renders the Year Founded input', () => {
    renderProfileWithExistingProfile()
    expect(screen.getByLabelText(/year founded/i)).toBeInTheDocument()
  })

  it('Year Founded input has type="number"', () => {
    renderProfileWithExistingProfile()
    const input = screen.getByLabelText(/year founded/i)
    expect(input).toHaveAttribute('type', 'number')
  })

  it('Year Founded input pre-fills with the profile value', () => {
    renderProfileWithExistingProfile({ founded_year: 2015 })
    const input = screen.getByLabelText(/year founded/i) as HTMLInputElement
    expect(input.value).toBe('2015')
  })
})

// ── Age warning ───────────────────────────────────────────────────────────────

describe('Profile page — org age warning', () => {
  const currentYear = new Date().getFullYear()

  it('shows ineligibility warning when org was founded THIS year', async () => {
    const user = userEvent.setup()
    renderProfileWithExistingProfile({ founded_year: null })

    const input = screen.getByLabelText(/year founded/i)
    await user.clear(input)
    await user.type(input, String(currentYear))

    await waitFor(() => {
      expect(screen.getByText(/under 1 year old/i)).toBeInTheDocument()
    })
  })

  it('shows "2+ years" warning when org was founded last year', async () => {
    const user = userEvent.setup()
    renderProfileWithExistingProfile({ founded_year: null })

    const input = screen.getByLabelText(/year founded/i)
    await user.clear(input)
    await user.type(input, String(currentYear - 1))

    await waitFor(() => {
      expect(screen.getByText(/2\+ years/i)).toBeInTheDocument()
    })
  })

  it('shows NO age warning when org is 3+ years old', async () => {
    renderProfileWithExistingProfile({ founded_year: currentYear - 3 })

    expect(screen.queryByText(/under 1 year old/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/2\+ years/i)).not.toBeInTheDocument()
  })
})

// ── NotificationSettings visibility ──────────────────────────────────────────

describe('Profile page — NotificationSettings section', () => {
  it('does NOT render NotificationSettings on first-time setup (profile is null)', () => {
    renderProfileSetup()
    // The notification section title should not be present during setup
    expect(screen.queryByText(/email notifications/i)).not.toBeInTheDocument()
  })

  it('renders NotificationSettings for an existing profile', async () => {
    renderProfileWithExistingProfile()

    // The notification section loads asynchronously (fetches prefs)
    await waitFor(() => {
      expect(screen.getByText(/email notifications/i)).toBeInTheDocument()
    })
  })
})

// ── Email Notifications toggle ────────────────────────────────────────────────

describe('Profile page — Email Notifications toggle', () => {
  it('renders an Email Notifications toggle switch (role=switch)', async () => {
    renderProfileWithExistingProfile()

    await waitFor(() => {
      const toggles = screen.getAllByRole('switch')
      expect(toggles.length).toBeGreaterThan(0)
    })
  })
})

// ── Weekly digest toggle ──────────────────────────────────────────────────────

describe('Profile page — Weekly digest toggle', () => {
  it('renders "Weekly Grant Digest" toggle text', async () => {
    renderProfileWithExistingProfile()

    await waitFor(() => {
      expect(screen.getByText(/weekly grant digest/i)).toBeInTheDocument()
    })
  })
})

// ── Deadline reminder day pills ───────────────────────────────────────────────

describe('Profile page — Deadline reminder day pills', () => {
  const DAYS = [60, 30, 14, 7, 3, 1]

  it.each(DAYS)('renders a pill for %d day(s)', async (days) => {
    renderProfileWithExistingProfile()

    await waitFor(() => {
      const label = days === 1 ? '1 day' : `${days} days`
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    })
  })
})

// ── Send Test Email button ────────────────────────────────────────────────────

describe('Profile page — Send Test Email button', () => {
  it('renders a "Send Test Email" button', async () => {
    renderProfileWithExistingProfile()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send test email/i })).toBeInTheDocument()
    })
  })
})
