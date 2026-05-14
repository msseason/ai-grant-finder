import { supabase } from './supabase'
import type { Grant } from '../types'

export interface GrantSearchParams {
  keyword?:    string
  type?:       string
  eligibility?: string   // 'all' | 'for-profit' | 'nonprofit' | 'higher-ed' | 'government'
  scope?:      string    // 'federal' | 'state'
  page?:       number
  limit?:      number
}

export interface LiveSearchResult {
  grants:            Grant[]
  totalCount:        number
  source:            string
  keyword:           string
  eligibilityOptions: EligibilityOption[]
}

export interface EligibilityOption {
  label: string
  value: string
  count: number
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-grants`

// ── Live fetch from Grants.gov via edge function ──────────────────────────────
export async function searchGrantsLive(
  params: GrantSearchParams,
  profile?: Record<string, unknown> | null,
): Promise<LiveSearchResult> {
  const res = await fetch(EDGE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...params, profile }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText)
    throw new Error(`search-grants edge function ${res.status}: ${txt}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as LiveSearchResult
}

// ── Primary search — live first, DB fallback ──────────────────────────────────
export async function searchGrants(
  params: GrantSearchParams = {},
  profile?: Record<string, unknown> | null,
): Promise<Grant[]> {
  try {
    const result = await searchGrantsLive(params, profile)
    return result.grants
  } catch (err) {
    console.warn('[grantsApi] Live fetch failed, falling back to DB cache:', err)
    return searchGrantsDb(params)
  }
}

// ── DB-only search (cache / fallback) ────────────────────────────────────────
async function searchGrantsDb(params: GrantSearchParams): Promise<Grant[]> {
  let q = supabase.from('grants').select('*').order('created_at', { ascending: false })
  if (params.keyword) {
    // Sanitize keyword: strip characters that could manipulate the PostgREST filter string
    // Commas and parentheses are filter delimiters; percent signs are ilike wildcards
    const safeKeyword = params.keyword
      .replace(/[,()'"`]/g, '')   // remove PostgREST filter delimiters and quotes
      .replace(/%/g, '')           // remove user-supplied wildcards (we add our own)
      .trim()
      .slice(0, 200)
    if (safeKeyword) {
      q = q.or(
        `title.ilike.%${safeKeyword}%,eligibility.ilike.%${safeKeyword}%,provider.ilike.%${safeKeyword}%`
      )
    }
  }
  if (params.type) q = q.eq('type', params.type)
  const lim    = params.limit ?? 25
  const offset = ((params.page ?? 1) - 1) * lim
  q = q.range(offset, offset + lim - 1)
  const { data } = await q
  return data ?? []
}

// ── Upsert a live grant to DB before saving (FK constraint) ──────────────────
export async function upsertLiveGrant(grant: Grant): Promise<string> {
  // DB-native grants already have UUID ids (not 'gg-' prefixed)
  if (!String(grant.id).startsWith('gg-')) return grant.id

  const { data, error } = await supabase
    .from('grants')
    .upsert(
      {
        title:           grant.title,
        type:            grant.type,
        provider:        grant.provider,
        amount_min:      grant.amount_min,
        amount_max:      grant.amount_max,
        deadline:        grant.deadline,
        is_rolling:      grant.is_rolling ?? false,
        categories:      grant.categories ?? [],
        eligibility:     grant.eligibility,
        application_url: grant.application_url,
        source:          grant.source ?? 'grants.gov',
        external_id:     grant.external_id,   // DB column is external_id
        cfda_number:     grant.cfda_number,
        agency:          grant.agency,
        last_synced_at:  new Date().toISOString(),
      },
      { onConflict: 'external_id' }
    )
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

// ── Legacy sync trigger (kept for backwards compat) ───────────────────────────
export async function syncGrantsFromGovApi(keyword: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-grants', {
    body: { keyword, limit: 50 },
  })
  if (error) throw error
  return data?.synced ?? 0
}

// ── AI matching against any grant array (live or DB) ─────────────────────────
export async function getAiMatchesForGrants(
  profile: Record<string, unknown>,
  grants:  Grant[],
): Promise<Map<string, { score: number; reasoning: string; key_strengths: string[]; gaps: string[] }>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated — please sign in again')
  }
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-grants`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ profile, grants }),
    }
  )
  if (!res.ok) {
    let txt = res.statusText
    try { txt = await res.text() } catch { /* response may lack text() in test environments */ }
    throw new Error(`match-grants ${res.status}: ${txt}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  const map = new Map<string, { score: number; reasoning: string; key_strengths: string[]; gaps: string[] }>()
  for (const m of (data.matches ?? [])) {
    map.set(m.grant_id, { score: m.score, reasoning: m.reasoning, key_strengths: m.key_strengths ?? [], gaps: m.gaps ?? [] })
  }
  return map
}

// ── AI matching (Phase 3 — requires deployed match-grants function) ────────────
export async function getAiMatches(
  profileId: string
): Promise<{ grant: Grant; score: number; reasoning: string }[]> {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) return []

  const { data: grants } = await supabase.from('grants').select('*').order('created_at', { ascending: false }).limit(40)
  if (!grants?.length) return []

  const { data, error } = await supabase.functions.invoke('match-grants', {
    body: { profile, grantIds: grants.map((g) => g.id) },
  })
  if (error || !data?.matches) return []

  return data.matches
    .map((m: { grant_id: string; score: number; reasoning: string }) => ({
      grant:     grants.find((g) => g.id === m.grant_id)!,
      score:     m.score,
      reasoning: m.reasoning,
    }))
    .filter((r: { grant: Grant }) => r.grant)
}

// ── Formatting helpers ────────────────────────────────────────────────────────
export function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return 'View on Grants.gov'
  if (!max) return `$${fmt(min!)}`
  if (!min || min === 0) return `Up to $${fmt(max)}`
  if (min === max) return `$${fmt(min)}`
  return `$${fmt(min)} – $${fmt(max)}`
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function daysUntilDeadline(deadline: string | null, isRolling: boolean | null): string {
  if (isRolling) return 'Rolling'
  if (!deadline) return 'No deadline'
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  if (days < 0)   return 'Closed'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  if (days <= 30) return `${days} days left`
  if (days <= 90) return `${Math.ceil(days / 7)} weeks left`
  return new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
