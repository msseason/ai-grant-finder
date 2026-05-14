/**
 * Tests for new grantsApi functions:
 *  - searchGrantsLive
 *  - upsertLiveGrant
 *  - getAiMatchesForGrants
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Grant } from '../types'

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockUpsertSelect = vi.fn()
const mockUpsertSingle = vi.fn()
const mockUpsertChain  = { select: () => ({ single: mockUpsertSingle }) }
const mockUpsert       = vi.fn(() => mockUpsertChain)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: mockUpsert,
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [] }),
      or: vi.fn().mockReturnThis(),
    })),
  },
}))

// ── helpers ───────────────────────────────────────────────────────────────────
function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: 'gg-12345',
    source: 'grants.gov',
    external_id: 'ABCD-001',
    title: 'Test Grant',
    provider: 'NSF',
    type: 'Federal',
    categories: [],
    amount_min: null,
    amount_max: null,
    deadline: null,
    is_rolling: false,
    eligibility: null,
    description: null,
    application_url: null,
    cfda_number: null,
    agency: 'NSF',
    last_synced_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── searchGrantsLive ──────────────────────────────────────────────────────────

describe('searchGrantsLive', () => {
  const successPayload = {
    grants: [makeGrant({ id: 'gg-1', title: 'Live Grant 1' })],
    totalCount: 1,
    source: 'grants.gov',
    keyword: 'education',
    eligibilityOptions: [],
  }

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the edge function URL with POST and JSON body', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(successPayload),
      text: vi.fn(),
    })

    const { searchGrantsLive } = await import('../lib/grantsApi')
    await searchGrantsLive({ keyword: 'education' }, null)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/search-grants'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('returns the grants array from a successful response', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(successPayload),
      text: vi.fn(),
    })

    const { searchGrantsLive } = await import('../lib/grantsApi')
    const result = await searchGrantsLive({ keyword: 'education' })

    expect(result.grants).toHaveLength(1)
    expect(result.grants[0].title).toBe('Live Grant 1')
    expect(result.totalCount).toBe(1)
    expect(result.source).toBe('grants.gov')
  })

  it('throws when the HTTP response is not ok', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockResolvedValue('Server blew up'),
    })

    const { searchGrantsLive } = await import('../lib/grantsApi')
    await expect(searchGrantsLive({ keyword: 'test' })).rejects.toThrow('500')
  })

  it('throws when the response JSON contains an error field', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ error: 'quota exceeded' }),
      text: vi.fn(),
    })

    const { searchGrantsLive } = await import('../lib/grantsApi')
    await expect(searchGrantsLive({})).rejects.toThrow('quota exceeded')
  })

  it('includes profile in the request body when provided', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(successPayload),
      text: vi.fn(),
    })

    const profile = { org_type: 'nonprofit', description: 'We help communities.' }
    const { searchGrantsLive } = await import('../lib/grantsApi')
    await searchGrantsLive({ keyword: 'health' }, profile)

    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    )
    expect(callBody.profile).toEqual(profile)
    expect(callBody.keyword).toBe('health')
  })
})

// ── upsertLiveGrant ───────────────────────────────────────────────────────────

describe('upsertLiveGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the grant id unchanged when id does NOT start with "gg-"', async () => {
    const { upsertLiveGrant } = await import('../lib/grantsApi')
    const dbGrant = makeGrant({ id: 'uuid-native-1234' })

    const result = await upsertLiveGrant(dbGrant)

    expect(result).toBe('uuid-native-1234')
    // Should not call supabase.from at all for DB-native grants
    const { supabase } = await import('../lib/supabase')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('calls supabase upsert with external_id when id starts with "gg-"', async () => {
    mockUpsertSingle.mockResolvedValueOnce({ data: { id: 'uuid-new-5678' }, error: null })

    const { upsertLiveGrant } = await import('../lib/grantsApi')
    const liveGrant = makeGrant({ id: 'gg-OPPO-001', external_id: 'OPPO-001' })

    const result = await upsertLiveGrant(liveGrant)

    expect(result).toBe('uuid-new-5678')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ external_id: 'OPPO-001' }),
      { onConflict: 'external_id' }
    )
  })

  it('throws when supabase returns an error', async () => {
    mockUpsertSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key violation' },
    })

    const { upsertLiveGrant } = await import('../lib/grantsApi')
    const liveGrant = makeGrant({ id: 'gg-BAD-001' })

    await expect(upsertLiveGrant(liveGrant)).rejects.toMatchObject({
      message: 'duplicate key violation',
    })
  })
})

// ── getAiMatchesForGrants ─────────────────────────────────────────────────────

describe('getAiMatchesForGrants', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the match-grants edge function with profile and grants', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ matches: [] }),
    })

    const { getAiMatchesForGrants } = await import('../lib/grantsApi')
    const profile = { description: 'AI training org' }
    const grants  = [makeGrant({ id: 'gg-1' })]

    await getAiMatchesForGrants(profile, grants)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/match-grants'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      })
    )
  })

  it('returns an empty Map when matches array is empty', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ matches: [] }),
    })

    const { getAiMatchesForGrants } = await import('../lib/grantsApi')
    const result = await getAiMatchesForGrants({}, [makeGrant()])

    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })

  it('returns a Map keyed by grant_id with score and reasoning', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        matches: [
          {
            grant_id: 'gg-abc',
            score: 85,
            reasoning: 'Great fit for your sector.',
            key_strengths: ['Innovation'],
            gaps: [],
          },
          {
            grant_id: 'gg-xyz',
            score: 60,
            reasoning: 'Partial match.',
            key_strengths: [],
            gaps: ['Need more employees'],
          },
        ],
      }),
    })

    const { getAiMatchesForGrants } = await import('../lib/grantsApi')
    const result = await getAiMatchesForGrants({}, [makeGrant({ id: 'gg-abc' }), makeGrant({ id: 'gg-xyz' })])

    expect(result.size).toBe(2)
    expect(result.get('gg-abc')).toEqual({
      score: 85,
      reasoning: 'Great fit for your sector.',
      key_strengths: ['Innovation'],
      gaps: [],
    })
    expect(result.get('gg-xyz')?.score).toBe(60)
  })

  it('throws when the response contains an error field', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ error: 'ANTHROPIC_API_KEY not set' }),
    })

    const { getAiMatchesForGrants } = await import('../lib/grantsApi')
    await expect(getAiMatchesForGrants({}, [])).rejects.toThrow('ANTHROPIC_API_KEY not set')
  })
})
