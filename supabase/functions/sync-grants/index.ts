// Supabase Edge Function: sync-grants
// Fetches grants from Grants.gov and upserts into the grants table.
// Deploy: supabase functions deploy sync-grants

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const body = await req.json().catch(() => ({}))
  const keyword: string = body.keyword ?? ''
  const limit: number = Math.min(body.limit ?? 25, 100)

  // Grants.gov search API
  const grantsGovUrl = 'https://apply07.grants.gov/grantsws/rest/opportunities/search/'
  let grants: unknown[] = []

  try {
    const response = await fetch(grantsGovUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        oppStatuses: 'posted',
        fundingInstrumentTypes: 'G', // G = Grant
        rows: limit,
        startRecordNum: 0,
        sortBy: 'openDate|desc',
      }),
    })

    if (!response.ok) {
      throw new Error(`Grants.gov returned ${response.status}`)
    }

    const data = await response.json()
    grants = data.oppHits ?? []
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Grants.gov API error: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Transform to our schema
  const transformed = grants.map((g: Record<string, unknown>) => ({
    source: 'grants_gov',
    external_id: `gg_${g.id}`,
    title: (g.title as string) ?? 'Untitled',
    provider: (g.agencyName as string) ?? null,
    type: 'Federal' as const,
    categories: [g.fundingActivityCategory as string].filter(Boolean),
    amount_min: (g.awardFloor as number) ?? null,
    amount_max: (g.awardCeiling as number) ?? null,
    deadline: g.closeDate
      ? new Date(g.closeDate as string).toISOString().split('T')[0]
      : null,
    is_rolling: !g.closeDate,
    eligibility: Array.isArray(g.eligibilities)
      ? (g.eligibilities as string[]).join(', ')
      : null,
    description: (g.synopsis as string)?.slice(0, 2000) ?? null,
    application_url: `https://www.grants.gov/search-results-detail/${g.id}`,
    cfda_number: Array.isArray(g.cfdaNumbers) ? (g.cfdaNumbers as string[])[0] ?? null : null,
    agency: (g.agencyCode as string) ?? null,
    last_synced_at: new Date().toISOString(),
  }))

  if (transformed.length === 0) {
    return new Response(
      JSON.stringify({ synced: 0, message: 'No grants returned from Grants.gov for this keyword.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('grants')
    .upsert(transformed, { onConflict: 'external_id', ignoreDuplicates: false })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ synced: transformed.length, keyword }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
