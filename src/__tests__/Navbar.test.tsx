import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar'

// Mock supabase to prevent env-var errors
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => ({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}))

// Mock useAuth so we control logged-in/out state
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { useAuth } from '../hooks/useAuth'

const mockUseAuth = vi.mocked(useAuth)

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  )
}

// ---------- Logged out state ----------

describe('Navbar — logged out', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      signOut: vi.fn(),
      setProfile: vi.fn(),
    })
  })

  it('renders GrantFinder brand name', () => {
    renderNavbar()
    // There may be multiple brand elements; just check at least one exists
    expect(screen.getAllByText(/GrantFinder|Grant/).length).toBeGreaterThan(0)
  })

  it('shows Sign in link', () => {
    renderNavbar()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('shows Get Started link', () => {
    renderNavbar()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('does not show nav links (Dashboard, Find Grants, etc.)', () => {
    renderNavbar()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Find Grants')).not.toBeInTheDocument()
    expect(screen.queryByText('Applications')).not.toBeInTheDocument()
  })

  it('does not show Sign out button', () => {
    renderNavbar()
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })
})

// ---------- Logged in state ----------

describe('Navbar — logged in', () => {
  const mockSignOut = vi.fn()

  beforeEach(() => {
    mockSignOut.mockReset()
    mockNavigate.mockReset()
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any,
      session: { access_token: 'tok', user: {} } as any,
      profile: {
        id: 'p1',
        user_id: 'user-1',
        org_name: 'Test Org',
        org_type: null,
        description: null,
        mission: null,
        industries: [],
        location_state: null,
        location_city: null,
        annual_budget: null,
        employee_count: null,
        website: null,
        ein: null,
        founded_year: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      loading: false,
      signOut: mockSignOut,
      setProfile: vi.fn(),
    })
  })

  it('shows Dashboard nav link', () => {
    renderNavbar('/dashboard')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows Find Grants nav link', () => {
    renderNavbar('/dashboard')
    expect(screen.getByText('Find Grants')).toBeInTheDocument()
  })

  it('shows Applications nav link', () => {
    renderNavbar('/dashboard')
    expect(screen.getByText('Applications')).toBeInTheDocument()
  })

  it('shows Profile nav link', () => {
    renderNavbar('/dashboard')
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('shows Sign out button', () => {
    renderNavbar('/dashboard')
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('does not show Sign in or Get Started', () => {
    renderNavbar('/dashboard')
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
  })

  it('displays org name', () => {
    renderNavbar('/dashboard')
    expect(screen.getByText('Test Org')).toBeInTheDocument()
  })

  it('calls signOut and navigates to "/" on sign out click', async () => {
    mockSignOut.mockResolvedValue(undefined)
    renderNavbar('/dashboard')

    fireEvent.click(screen.getByText('Sign out'))

    // Allow the async signOut to complete
    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
