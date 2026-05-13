import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatAmount, daysUntilDeadline } from '../lib/grantsApi'

// Mock supabase so the module import doesn't throw on missing env vars
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
    functions: {
      invoke: vi.fn(),
    },
  },
}))

// ---------- formatAmount ----------

describe('formatAmount', () => {
  it('returns "View on Grants.gov" when both are null', () => {
    expect(formatAmount(null, null)).toBe('View on Grants.gov')
  })

  it('returns "View on Grants.gov" when both are 0 (falsy)', () => {
    expect(formatAmount(0, 0)).toBe('View on Grants.gov')
  })

  it('returns "Up to $X" when only max is set', () => {
    expect(formatAmount(null, 50000)).toBe('Up to $50K')
    expect(formatAmount(0, 1000000)).toBe('Up to $1.0M')
  })

  it('returns "$X" when only min is set (no max)', () => {
    expect(formatAmount(10000, null)).toBe('$10K')
  })

  it('returns "$X" when min equals max', () => {
    expect(formatAmount(25000, 25000)).toBe('$25K')
  })

  it('returns "$min – $max" range', () => {
    expect(formatAmount(10000, 50000)).toBe('$10K – $50K')
  })

  it('formats millions correctly', () => {
    expect(formatAmount(1000000, 5000000)).toBe('$1.0M – $5.0M')
  })

  it('formats small amounts without suffix', () => {
    expect(formatAmount(500, 999)).toBe('$500 – $999')
  })
})

// ---------- daysUntilDeadline ----------

describe('daysUntilDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('returns "Rolling" when isRolling is true regardless of deadline', () => {
    expect(daysUntilDeadline(null, true)).toBe('Rolling')
    expect(daysUntilDeadline('2020-01-01', true)).toBe('Rolling')
  })

  it('returns "No deadline" when deadline is null and not rolling', () => {
    expect(daysUntilDeadline(null, false)).toBe('No deadline')
  })

  it('returns "Closed" for a past deadline', () => {
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
    expect(daysUntilDeadline('2025-05-01', false)).toBe('Closed')
  })

  it('returns "Due today" when deadline is today', () => {
    vi.setSystemTime(new Date('2025-06-15T00:00:00Z'))
    expect(daysUntilDeadline('2025-06-15', false)).toBe('Due today')
  })

  it('returns "1 day left" when deadline is tomorrow', () => {
    vi.setSystemTime(new Date('2025-06-14T00:00:00Z'))
    expect(daysUntilDeadline('2025-06-15', false)).toBe('1 day left')
  })

  it('returns "X days left" for deadlines within 30 days', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    expect(daysUntilDeadline('2025-06-20', false)).toBe('19 days left')
  })

  it('returns "X weeks left" for deadlines 31–90 days away', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    // 60 days out = ceil(60/7) = 9 weeks
    expect(daysUntilDeadline('2025-07-31', false)).toBe('9 weeks left')
  })

  it('returns formatted date for deadlines more than 90 days away', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const result = daysUntilDeadline('2026-01-15', false)
    // Should be a human-readable date string, not a days/weeks count
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })
})
