/**
 * Tests for src/components/GrantorAnalysisModal.tsx
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Supabase mock (required by module graph) ──────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

// ── Stub VITE env var ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
})

afterEach(() => {
  vi.restoreAllMocks()
})

import GrantorAnalysisModal from '../components/GrantorAnalysisModal'

const MOCK_GRANTOR_DATA = {
  agency: 'National Science Foundation',
  totalAwards: 423,
  totalAmountFmt: '$142.3M',
  avgAwardFmt: '$336K',
  minFmt: '$25K',
  maxFmt: '$2.1M',
  dataRange: '2021–2024',
  topRecipients: [
    { name: 'MIT', amountFmt: '$12.4M' },
    { name: 'Stanford', amountFmt: '$10.1M' },
  ],
  stateBreakdown: [
    { state: 'CA', amountFmt: '$32.1M' },
    { state: 'MA', amountFmt: '$20.4M' },
  ],
  recentAwards: [
    { title: 'AI Research Grant', recipient: 'MIT', amountFmt: '$500K', date: '2024-01-15', state: 'MA' },
  ],
  redFlags: [],
}

function renderModal(agency = 'National Science Foundation', onClose = vi.fn()) {
  return render(<GrantorAnalysisModal agency={agency} onClose={onClose} />)
}

// ── Loading state ─────────────────────────────────────────────────────────────

describe('GrantorAnalysisModal — loading state', () => {
  it('shows loading skeleton while fetch is in progress', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    renderModal()

    // Skeleton divs have animate-pulse class — check via aria role or test id
    // The component renders 3 skeleton divs with animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders the agency name in the header while loading', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    renderModal('National Science Foundation')

    expect(screen.getByText('National Science Foundation')).toBeInTheDocument()
  })
})

// ── Header / close ────────────────────────────────────────────────────────────

describe('GrantorAnalysisModal — header', () => {
  it('displays the agency name in the modal header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(MOCK_GRANTOR_DATA),
    })

    renderModal('National Science Foundation')

    await waitFor(() => {
      expect(screen.getByText('National Science Foundation')).toBeInTheDocument()
    })
  })

  it('calls onClose when the close button is clicked', async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const onClose = vi.fn()
    renderModal('NSF', onClose)

    const closeBtn = screen.getByRole('button')
    await userEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('GrantorAnalysisModal — error state', () => {
  it('shows error message when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    renderModal()

    await waitFor(() => {
      expect(screen.getByText(/could not load grantor data/i)).toBeInTheDocument()
    })
  })

  it('shows error message from response error field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: 'Agency not found in USASpending' }),
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText('Agency not found in USASpending')).toBeInTheDocument()
    })
  })
})

// ── Data loaded state ─────────────────────────────────────────────────────────

describe('GrantorAnalysisModal — data loaded', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(MOCK_GRANTOR_DATA),
    })
  })

  it('shows totalAwards stat after data loads', async () => {
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('423')).toBeInTheDocument()
    })
  })

  it('shows avgAward stat after data loads', async () => {
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('$336K')).toBeInTheDocument()
    })
  })

  it('shows the data range note', async () => {
    renderModal()

    await waitFor(() => {
      expect(screen.getByText(/2021.*2024/)).toBeInTheDocument()
    })
  })

  it('shows top recipients', async () => {
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('MIT')).toBeInTheDocument()
      expect(screen.getByText('Stanford')).toBeInTheDocument()
    })
  })
})

// ── Red flags ─────────────────────────────────────────────────────────────────

describe('GrantorAnalysisModal — red flags', () => {
  it('does NOT render red flags section when redFlags is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ ...MOCK_GRANTOR_DATA, redFlags: [] }),
    })

    renderModal()

    await waitFor(() => {
      expect(screen.queryByText('Watch out')).not.toBeInTheDocument()
    })
  })

  it('renders red flags section when redFlags has items', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        ...MOCK_GRANTOR_DATA,
        redFlags: ['Historically awards 90%+ to R1 universities', 'Rarely funds <$500K organizations'],
      }),
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText('Watch out')).toBeInTheDocument()
      expect(screen.getByText('Historically awards 90%+ to R1 universities')).toBeInTheDocument()
      expect(screen.getByText('Rarely funds <$500K organizations')).toBeInTheDocument()
    })
  })
})
