import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '../pages/Login'

// Mock supabase
const mockSignInWithPassword = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: vi.fn(),
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

// ---------- Form rendering ----------

describe('Login page — form renders correctly', () => {
  it('renders the heading', () => {
    renderLogin()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders email input', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('you@organization.org')).toBeInTheDocument()
  })

  it('renders password input (type password by default)', () => {
    renderLogin()
    const pw = screen.getByPlaceholderText('••••••••')
    expect(pw).toHaveAttribute('type', 'password')
  })

  it('renders Sign In button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders link to Sign Up page', () => {
    renderLogin()
    expect(screen.getByText('Get started free')).toBeInTheDocument()
  })
})

// ---------- Password visibility toggle ----------

describe('Login page — password visibility toggle', () => {
  it('toggles password input type when eye button clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    const pwInput = screen.getByPlaceholderText('••••••••')
    expect(pwInput).toHaveAttribute('type', 'password')

    // The eye toggle button is the only button that is not "Sign In"
    const toggleBtn = screen.getByRole('button', { name: '' })
    await user.click(toggleBtn)

    expect(pwInput).toHaveAttribute('type', 'text')

    await user.click(toggleBtn)
    expect(pwInput).toHaveAttribute('type', 'password')
  })
})

// ---------- Error handling ----------

describe('Login page — error on invalid submission', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset()
    mockNavigate.mockReset()
  })

  it('shows error message from Supabase on failed login', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'bad@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('shows "Signing in..." during loading', async () => {
    // Return a never-resolving promise to keep loading state
    mockSignInWithPassword.mockReturnValue(new Promise(() => {}))

    renderLogin()

    fireEvent.change(screen.getByPlaceholderText('you@organization.org'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })
  })

  it('navigates to /dashboard on successful login', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({ error: null })

    renderLogin()

    await user.type(screen.getByPlaceholderText('you@organization.org'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'validpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
