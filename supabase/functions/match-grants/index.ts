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

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not set. Run: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json()
  const { profile, grantIds } = body

  if (!profile) {
    return new Response(
      JSON.stringify({ error: 'profile is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch grants to analyze
  let query = supabase.from('grants').select('*').limit(30)
  if (grantIds?.length) {
    query = query.in('id', grantIds)
  }
  const { data: grants } = await query

  if (!grants?.length) {
    return new Response(
      JSON.stringify({ matches: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const grantsText = grants.map((g: Record<string, unknown>) =>
    `ID: ${g.id}
Title: ${g.title}
Provider: ${g.provider ?? 'Unknown'}
Type: ${g.type ?? 'Unknown'}
Amount: $${g.amount_min ?? 0} – $${g.amount_max ?? 'varies'}
Categories: ${(g.categories as string[])?.join(', ') ?? 'General'}
Eligibility: ${g.eligibility ?? 'Not specified'}
Description: ${String(g.description ?? '').slice(0, 250)}`
  ).join('\n---\n')

  const prompt = `You are an expert grant consultant with 10 years of experience. Analyze these grants for the following organization:

ORGANIZATION PROFILE:
Name: ${profile.org_name ?? 'Not specified'}
Type: ${profile.org_type ?? 'Not specified'}
Sectors/Industries: ${profile.industries?.join(', ') ?? 'Not specified'}
Location: ${profile.location_city ?? ''}, ${profile.location_state ?? 'Not specified'}
Description: ${profile.description ?? 'Not provided'}
Mission: ${profile.mission ?? 'Not provided'}
Annual Budget: $${profile.annual_budget?.toLocaleString() ?? 'Unknown'}
Team Size: ${profile.employee_count ?? 'Unknown'}

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
