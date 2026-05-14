// Supabase Edge Function: match-grants
// Uses Claude AI to score and explain grant matches for a user's profile.
// Deploy: supabase functions deploy match-grants
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── JWT authentication required ────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const jwt = authHeader.slice(7)

  // Verify JWT with the anon client (no service role key needed for verification)
  const supabaseAnon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(jwt)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not set. Run: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Use service role only for DB queries (grants table read)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json()
  const { profile, grantIds, grants: inlineGrants } = body

  if (!profile) {
    return new Response(
      JSON.stringify({ error: 'profile is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch grants to analyze (prefer inline grants passed from client to avoid extra DB round-trip)
  let grants: Record<string, unknown>[] | null = null
  if (Array.isArray(inlineGrants) && inlineGrants.length > 0) {
    // Sanitize: strip any fields we don't need and cap at 30
    grants = inlineGrants.slice(0, 30).map((g: Record<string, unknown>) => ({
      id: String(g.id ?? ''),
      title: String(g.title ?? ''),
      provider: g.provider != null ? String(g.provider) : null,
      type: g.type != null ? String(g.type) : null,
      amount_min: typeof g.amount_min === 'number' ? g.amount_min : null,
      amount_max: typeof g.amount_max === 'number' ? g.amount_max : null,
      categories: Array.isArray(g.categories) ? g.categories.map(String) : [],
      eligibility: g.eligibility != null ? String(g.eligibility) : null,
      description: g.description != null ? String(g.description).slice(0, 250) : null,
    }))
  } else {
    let query = supabase.from('grants').select('*').limit(30)
    if (Array.isArray(grantIds) && grantIds.length > 0) {
      query = query.in('id', grantIds)
    }
    const { data } = await query
    grants = data ?? []
  }

  if (!grants?.length) {
    return new Response(
      JSON.stringify({ matches: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Sanitize profile fields to prevent prompt injection — strip/truncate everything
  function sanitize(val: unknown, maxLen = 300): string {
    if (val == null) return ''
    return String(val).replace(/[<>{}\\]/g, '').slice(0, maxLen)
  }
  function sanitizeArray(val: unknown, maxItems = 20, maxEach = 60): string {
    if (!Array.isArray(val)) return ''
    return val.slice(0, maxItems).map(v => sanitize(v, maxEach)).join(', ')
  }

  const safeProfile = {
    org_name:       sanitize(profile.org_name),
    org_type:       sanitize(profile.org_type, 60),
    industries:     sanitizeArray(profile.industries),
    location_city:  sanitize(profile.location_city, 100),
    location_state: sanitize(profile.location_state, 100),
    description:    sanitize(profile.description, 1000),
    mission:        sanitize(profile.mission, 500),
    annual_budget:  typeof profile.annual_budget === 'number' ? profile.annual_budget : null,
    employee_count: typeof profile.employee_count === 'number' ? profile.employee_count : null,
  }

  const grantsText = grants.map((g: Record<string, unknown>) =>
    `ID: ${sanitize(g.id, 100)}
Title: ${sanitize(g.title)}
Provider: ${sanitize(g.provider) || 'Unknown'}
Type: ${sanitize(g.type, 60) || 'Unknown'}
Amount: $${g.amount_min ?? 0} – $${g.amount_max ?? 'varies'}
Categories: ${sanitizeArray(g.categories) || 'General'}
Eligibility: ${sanitize(g.eligibility) || 'Not specified'}
Description: ${sanitize(g.description, 250)}`
  ).join('\n---\n')

  const prompt = `You are an expert grant consultant with 10 years of experience. Analyze these grants for the following organization:

ORGANIZATION PROFILE:
Name: ${safeProfile.org_name || 'Not specified'}
Type: ${safeProfile.org_type || 'Not specified'}
Sectors/Industries: ${safeProfile.industries || 'Not specified'}
Location: ${safeProfile.location_city}, ${safeProfile.location_state || 'Not specified'}
Description: ${safeProfile.description || 'Not provided'}
Mission: ${safeProfile.mission || 'Not provided'}
Annual Budget: $${safeProfile.annual_budget?.toLocaleString() ?? 'Unknown'}
Team Size: ${safeProfile.employee_count ?? 'Unknown'}

GRANTS TO ANALYZE:
${grantsText}

Score each grant 0–100 for match quality. Consider:
- Organization type eligibility (30%)
- Sector/industry alignment (30%)
- Geographic eligibility (20%)
- Budget/size fit (20%)

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "matches": [
    {
      "grant_id": "...",
      "score": 85,
      "reasoning": "2-3 sentences explaining why this is or isn't a strong match, what they'd need to demonstrate, and any key risks.",
      "key_strengths": ["strength 1", "strength 2"],
      "gaps": ["gap 1"]
    }
  ]
}

Include only grants with score >= 40. Sort by score descending. Be specific and honest.`

  // Call Claude API (claude-haiku for cost efficiency on matching)
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    return new Response(
      JSON.stringify({ error: `Claude API error: ${err}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const claudeData = await claudeRes.json()
  const text = claudeData.content?.[0]?.text ?? ''

  let result: { matches: unknown[] }
  try {
    // Extract JSON (Claude sometimes wraps in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { matches: [] }
  } catch {
    result = { matches: [] }
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
