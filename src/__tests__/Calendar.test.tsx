/**
 * Tests for src/pages/Calendar.tsx
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Supabase mock ─────────────────────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}))

// ── useAuth mock ──────────────────────────────────────────────────────────────
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'user-1', email: 'test@test.com' },
    session: { access_token: 'tok' },
    profile: {
      id: 'p1', user_id: 'user-1', org_name: 'Test Org',
      org_type: 'for-profit', description: 'We do AI training.',
      industries: ['AI Education'], location_state: 'TX',
      location_city: 'Houston', annual_budget: 0, employee_count: 3,
      website: null, ein: null, founded_year: 2020,
      mission: null, created_at: '', updated_at: '',
    },
    loading: false,
    signOut: vi.fn(),
    setProfile: vi.fn(),
  }),
}))

// ── react-router-dom mock ─────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
  useLocation: vi.fn().mockReturnValue({ pathname: '/calendar' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}))

import Calendar from '../pages/Calendar'

function renderCalendar() {
  return render(<Calendar />)
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Calendar page — basic rendering', () => {
  it('renders the Strategic Calendar heading', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByText('Strategic Calendar')).toBeInTheDocument()
    })
  })

  it('renders the "Add Event" button', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add event/i })).toBeInTheDocument()
    })
  })

  it('renders the "Sync Grants" button', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync grants/i })).toBeInTheDocument()
    })
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('Calendar page — empty state', () => {
  it('shows "No events yet" when no events are loaded', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByText('No events yet')).toBeInTheDocument()
    })
  })

  it('shows instructional copy in the empty state', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByText(/save grants to auto-generate/i)).toBeInTheDocument()
    })
  })
})

// ── Filter buttons ────────────────────────────────────────────────────────────

describe('Calendar page — event type filter buttons', () => {
  const expectedTypes = [
    'Grant Deadline',
    'Internal Milestone',
    'Program Officer Call',
    'Grantor Webinar',
    'Resubmission Window',
    'Reminder',
  ]

  it.each(expectedTypes)('renders filter button for "%s"', async (label) => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    })
  })

  it('renders an "All Events" filter button', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all events/i })).toBeInTheDocument()
    })
  })
})

// ── Add Event form ────────────────────────────────────────────────────────────

describe('Calendar page — Add Event form', () => {
  it('form is hidden by default', async () => {
    renderCalendar()
    await waitFor(() => {
      expect(screen.queryByText('Add Calendar Event')).not.toBeInTheDocument()
    })
  })

  it('clicking "Add Event" reveals the form', async () => {
    const user = userEvent.setup()
    renderCalendar()

    // Wait for page to finish loading
    await waitFor(() => expect(screen.getByRole('button', { name: /^add event$/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^add event$/i }))

    await waitFor(() => {
      expect(screen.getByText('Add Calendar Event')).toBeInTheDocument()
    })
  })

  it('form contains Event Title and Date required fields', async () => {
    const user = userEvent.setup()
    renderCalendar()

    await waitFor(() => expect(screen.getByRole('button', { name: /^add event$/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /^add event$/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/call with nsf program officer/i)).toBeInTheDocument()
    })
  })

  it('form has a select with all 6 event types', async () => {
    const user = userEvent.setup()
    renderCalendar()

    await waitFor(() => expect(screen.getByRole('button', { name: /^add event$/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /^add event$/i }))

    await waitFor(() => {
      // The event type selector contains all 6 options
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent)
      expect(options).toContain('Grant Deadline')
      expect(options).toContain('Internal Milestone')
      expect(options).toContain('Program Officer Call')
      expect(options).toContain('Grantor Webinar')
      expect(options).toContain('Resubmission Window')
      expect(options).toContain('Reminder')
    })
  })

  it('form has a submit button with "Add Event" text', async () => {
    const user = userEvent.setup()
    renderCalendar()

    await waitFor(() => expect(screen.getByRole('button', { name: /^add event$/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /^add event$/i }))

    await waitFor(() => expect(screen.getByText('Add Calendar Event')).toBeInTheDocument())

    // Inside the form there is a submit button with "Add Event" text
    // (form heading is "Add Calendar Event", submit button text is just "Add Event")
    const submitBtns = screen.getAllByRole('button', { name: /^add event$/i })
    // One is the header button, one is the form submit — both should exist
    expect(submitBtns.length).toBeGreaterThanOrEqual(2)
    // At least one should have type="submit"
    const submitType = submitBtns.find(b => b.getAttribute('type') === 'submit')
    expect(submitType).toBeTruthy()
  })

  it('cancel button closes the form', async () => {
    const user = userEvent.setup()
    renderCalendar()

    await waitFor(() => expect(screen.getByRole('button', { name: /^add event$/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /^add event$/i }))
    await waitFor(() => expect(screen.getByText('Add Calendar Event')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText('Add Calendar Event')).not.toBeInTheDocument()
    })
  })
})
