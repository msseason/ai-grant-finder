import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GrantCard from '../components/GrantCard'
import type { Grant } from '../types'

// Mock supabase to prevent env-var errors
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => ({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    functions: { invoke: vi.fn() },
  },
}))

function makeFederalGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: 'g1',
    title: 'Federal Test Grant',
    type: 'Federal',
    provider: 'USDA',
    amount_min: 10000,
    amount_max: 50000,
    deadline: null,
    is_rolling: true,
    categories: ['Agriculture', 'Rural Development'],
    eligibility: 'Small farms only',
    description: null,
    application_url: 'https://example.com/apply',
    source: 'manual',
    external_id: null,
    cfda_number: null,
    agency: null,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ---------- Rendering with different grant types ----------

describe('GrantCard — type badges', () => {
  it('renders Federal type badge', () => {
    render(<GrantCard grant={makeFederalGrant({ type: 'Federal' })} />)
    expect(screen.getByText('Federal')).toBeInTheDocument()
  })

  it('renders State type badge', () => {
    render(<GrantCard grant={makeFederalGrant({ type: 'State' })} />)
    expect(screen.getByText('State')).toBeInTheDocument()
  })

  it('renders Foundation type badge', () => {
    render(<GrantCard grant={makeFederalGrant({ type: 'Foundation' })} />)
    expect(screen.getByText('Foundation')).toBeInTheDocument()
  })

  it('renders Corporate type badge', () => {
    render(<GrantCard grant={makeFederalGrant({ type: 'Corporate' })} />)
    expect(screen.getByText('Corporate')).toBeInTheDocument()
  })

  it('renders grant title', () => {
    render(<GrantCard grant={makeFederalGrant({ title: 'My Awesome Grant' })} />)
    expect(screen.getByText('My Awesome Grant')).toBeInTheDocument()
  })

  it('renders provider name', () => {
    render(<GrantCard grant={makeFederalGrant({ provider: 'Department of Energy' })} />)
    expect(screen.getByText('Department of Energy')).toBeInTheDocument()
  })
})

// ---------- Amount and deadline display ----------

describe('GrantCard — amount and deadline', () => {
  it('shows formatted amount range', () => {
    render(<GrantCard grant={makeFederalGrant({ amount_min: 10000, amount_max: 50000, is_rolling: true })} />)
    expect(screen.getByText('$10K – $50K')).toBeInTheDocument()
  })

  it('shows "View on Grants.gov" when no amount set', () => {
    render(<GrantCard grant={makeFederalGrant({ amount_min: null, amount_max: null, is_rolling: true })} />)
    expect(screen.getByText('View on Grants.gov')).toBeInTheDocument()
  })

  it('shows "Rolling" deadline for rolling grants', () => {
    render(<GrantCard grant={makeFederalGrant({ is_rolling: true, deadline: null })} />)
    expect(screen.getByText('Rolling')).toBeInTheDocument()
  })

  it('shows "Closed" for past deadline', () => {
    render(<GrantCard grant={makeFederalGrant({ is_rolling: false, deadline: '2020-01-01' })} />)
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })
})

// ---------- Closed grant opacity ----------

describe('GrantCard — closed grant styling', () => {
  it('adds opacity-60 class when grant is closed', () => {
    const { container } = render(
      <GrantCard grant={makeFederalGrant({ is_rolling: false, deadline: '2020-01-01' })} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('opacity-60')
  })

  it('does not add opacity-60 when grant is open (rolling)', () => {
    const { container } = render(
      <GrantCard grant={makeFederalGrant({ is_rolling: true })} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('opacity-60')
  })
})

// ---------- Bookmark button states ----------

describe('GrantCard — bookmark button', () => {
  it('shows "Save grant" title when not saved', () => {
    const onSave = vi.fn()
    render(<GrantCard grant={makeFederalGrant()} onSave={onSave} isSaved={false} />)
    const btn = screen.getByTitle('Save grant')
    expect(btn).toBeInTheDocument()
  })

  it('shows "Unsave grant" title when saved', () => {
    const onUnsave = vi.fn()
    render(<GrantCard grant={makeFederalGrant()} onUnsave={onUnsave} isSaved={true} />)
    const btn = screen.getByTitle('Unsave')
    expect(btn).toBeInTheDocument()
  })

  it('calls onSave when Save button clicked (not saved)', () => {
    const onSave = vi.fn()
    render(<GrantCard grant={makeFederalGrant()} onSave={onSave} isSaved={false} />)
    fireEvent.click(screen.getByTitle('Save grant'))
    expect(onSave).toHaveBeenCalledWith('g1')
  })

  it('calls onUnsave when Unsave button clicked (saved)', () => {
    const onUnsave = vi.fn()
    render(<GrantCard grant={makeFederalGrant()} onUnsave={onUnsave} isSaved={true} />)
    fireEvent.click(screen.getByTitle('Unsave'))
    expect(onUnsave).toHaveBeenCalledWith('g1')
  })

  it('does not render bookmark button when no onSave/onUnsave provided', () => {
    render(<GrantCard grant={makeFederalGrant()} />)
    expect(screen.queryByTitle('Save grant')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Unsave')).not.toBeInTheDocument()
  })
})

// ---------- Categories ----------

describe('GrantCard — categories', () => {
  it('renders up to 2 category tags', () => {
    render(
      <GrantCard
        grant={makeFederalGrant({ categories: ['Agriculture', 'Rural Development', 'Food Security'] })}
      />
    )
    expect(screen.getByText('Agriculture')).toBeInTheDocument()
    expect(screen.getByText('Rural Development')).toBeInTheDocument()
    // Third category is not shown (slice(0,2))
    expect(screen.queryByText('Food Security')).not.toBeInTheDocument()
  })
})

// ---------- Match score ring ----------

describe('GrantCard — match score', () => {
  it('shows score ring when matchScore is provided', () => {
    render(<GrantCard grant={makeFederalGrant()} matchScore={85} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('shows match reasoning when provided', () => {
    render(
      <GrantCard
        grant={makeFederalGrant()}
        matchScore={75}
        matchReasoning="Strong match for your agriculture profile"
      />
    )
    expect(screen.getByText('Strong match for your agriculture profile')).toBeInTheDocument()
  })
})
