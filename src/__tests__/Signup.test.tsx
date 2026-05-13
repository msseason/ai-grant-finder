import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Signup from '../pages/Signup'

// Mock supabase
const mockSignUp = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: (...args: unknown[]) => mockSignUp(...args),
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  )
}

// ---------- Form rendering ----------

describe('Signup page — form renders correctly', () => {
  it('renders the heading "Create your account"', () => {
    renderSignup()
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('renders email input', () => {
    renderSignup()
    expect(screen.getByPlaceholderText('you@organization.org')).toBeInTheDocument()
  })

  it('renders password input with minimum hint', () => {
    renderSignup()
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument()
  })

  it('renders confirm password input', () => {
    renderSignup()
    expect(screen.getByPlaceholderText('Repeat password')).toBeInTheDocument()
  })

  it('renders Create Account button', () => {
    renderSignup()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders Sign in link', () => {
    renderSignup()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })
})

// ---------- Password mismatch validation ----------

describe('Signup page — password mismatch validation', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
  })

  it('shows "Passwords do not match" error when passwords differ', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'password123')
    await user.type(screen.getByPlaceholderText('Repeat password'), 'differentpass')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    })

    // Supabase should NOT have been called
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})

// ---------- Password length validation ----------

describe('Signup page — password length validation', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
  })

  it('shows error when password is less than 8 characters', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'short')
    await user.type(screen.getByPlaceholderText('Repeat password'), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })
})

// ---------- Confirmation state ----------

describe('Signup page — confirmation state after submit', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
  })

  it('shows "Check your email" state after successful sign up', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ error: null })

    renderSignup()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'validpassword')
    await user.type(screen.getByPlaceholderText('Repeat password'), 'validpassword')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument()
    })

    expect(screen.getByText('new@example.com')).toBeInTheDocument()
  })

  it('shows "Back to Sign In" link in confirmation state', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ error: null })

    renderSignup()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'validpassword')
    await user.type(screen.getByPlaceholderText('Repeat password'), 'validpassword')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Back to Sign In')).toBeInTheDocument()
    })
  })

  it('shows Supabase error message when signUp fails', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ error: { message: 'Email already registered' } })

    renderSignup()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'existing@example.com')
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'validpassword')
    await user.type(screen.getByPlaceholderText('Repeat password'), 'validpassword')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })

    // Should not show confirmation state
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
  })
})
