import { supabase } from './supabase'
import type { Grant } from '../types'

export interface GrantSearchParams {
  keyword?: string
  type?: string
  amountMin?: number
  amountMax?: number
  deadline?: 'upcoming_30' | 'upcoming_90' | 'rolling'
  page?: number
  limit?: number
}

export async function searchGrants(params: GrantSearchParams = {}): Promise<Grant[]> {
  let query = supabase
    .from('grants')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })

  if (params.keyword) {
    query = query.or(
      `title.ilike.%${params.keyword}%,description.ilike.%${params.keyword}%,provider.ilike.%${params.keyword}%,eligibility.ilike.%${params.keyword}%`
    )
  }

  if (params.type) {
    query = query.eq('type', params.type)
  }

  if (params.amountMin !== undefined) {
    query = query.gte('amount_max', params.amountMin)
  }

  if (params.amountMax !== undefined) {
    query = query.lte('amount_min', params.amountMax)
  }

  if (params.deadline === 'upcoming_30') {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    query = query.lte('deadline', d.toISOString().split('T')[0])
  } else if (params.deadline === 'upcoming_90') {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    query = query.lte('deadline', d.toISOString().split('T')[0])
  } else if (params.deadline === 'rolling') {
    query = query.eq('is_rolling', true)
  }

  const limit = params.limit ?? 25
  const offset = ((params.page ?? 1) - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function syncGrantsFromGovApi(keyword: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-grants', {
    body: { keyword, limit: 50 },
  })
  if (error) throw error
  return data?.synced ?? 0
}

export async function getAiMatches(profileId: string): Promise<{ grant: Grant; score: number; reasoning: string }[]> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) return []

  const { data: grants } = await supabase
    .from('grants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40)

  if (!grants?.length) return []

  const { data, error } = await supabase.functions.invoke('match-grants', {
    body: { profile, grantIds: grants.map((g) => g.id) },
  })

  if (error || !data?.matches) return []

  return data.matches.map((m: { grant_id: string; score: number; reasoning: string }) => ({
    grant: grants.find((g) => g.id === m.grant_id)!,
    score: m.score,
    reasoning: m.reasoning,
  })).filter((r: { grant: Grant; score: number; reasoning: string }) => r.grant)
}

export function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return 'Amount varies'
  if (!max) return `$${formatNum(min!)}`
  if (!min || min === 0) return `Up to $${formatNum(max)}`
  if (min === max) return `$${formatNum(min)}`
  return `$${formatNum(min)} – $${formatNum(max)}`
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function daysUntilDeadline(deadline: string | null, isRolling: boolean): string {
  if (isRolling) return 'Rolling'
  if (!deadline) return 'No deadline'
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  if (days <= 30) return `${days} days left`
  if (days <= 90) return `${Math.ceil(days / 7)} weeks left`
  return new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
