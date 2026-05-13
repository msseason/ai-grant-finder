import { useState, useEffect, FormEvent } from 'react'
import {
  Search, SlidersHorizontal, X, Wifi, WifiOff,
  ChevronLeft, ChevronRight, ExternalLink, Building2, Sparkles, Loader,
} from 'lucide-react'
import Layout from '../components/Layout'
import GrantCard from '../components/GrantCard'
import GrantorAnalysisModal from '../components/GrantorAnalysisModal'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { searchGrantsLive, upsertLiveGrant, getAiMatchesForGrants, type GrantSearchParams, type LiveSearchResult } from '../lib/grantsApi'
import type { Grant, SavedGrant, FoundationResult } from '../types'

// ── Eligibility filters ───────────────────────────────────────────────────────
const ELIG_OPTIONS = [
  { value: 'all',        label: 'All',                   hint: 'Every open opportunity' },
  { value: 'for-profit', label: 'For-Profit / Small Biz',hint: 'Codes 09 & 22' },
  { value: 'nonprofit',  label: 'Nonprofit',             hint: '501(c)(3) & non-501(c)(3)' },
  { value: 'higher-ed',  label: 'Higher Education',      hint: 'Public & private universities' },
  { value: 'government', label: 'Government',            hint: 'State, county, city agencies' },
]

// ── State grant portals — every US state ─────────────────────────────────────
const STATE_PORTALS: Record<string, { name: string; url: string; notes: string }> = {
  AL:{name:'Alabama',url:'https://gis.adeca.alabama.gov/grants/',notes:'ADECA grants portal'},
  AK:{name:'Alaska',url:'https://grants.alaska.gov/',notes:'Alaska grants portal'},
  AZ:{name:'Arizona',url:'https://az.gov/grants',notes:'AZ state grants'},
  AR:{name:'Arkansas',url:'https://www.arkansas.gov/grants',notes:'AR grants'},
  CA:{name:'California',url:'https://www.grants.ca.gov/',notes:'CA Grants Portal — most comprehensive state portal'},
  CO:{name:'Colorado',url:'https://oedit.colorado.gov/grant-programs',notes:'OEDIT grant programs'},
  CT:{name:'Connecticut',url:'https://portal.ct.gov/OPM/Grants',notes:'CT OPM grants'},
  DE:{name:'Delaware',url:'https://grantinfo.delaware.gov/',notes:'DE grants portal'},
  FL:{name:'Florida',url:'https://www.floridajobs.org/business-growth-and-partnerships/for-businesses/incentives',notes:'DEO incentives & grants'},
  GA:{name:'Georgia',url:'https://www.georgia.org/competitive-advantages/grants',notes:'GA grants & incentives'},
  HI:{name:'Hawaii',url:'https://ltgov.hawaii.gov/grants/',notes:'HI grants'},
  ID:{name:'Idaho',url:'https://commerce.idaho.gov/grants/',notes:'ID Commerce grants'},
  IL:{name:'Illinois',url:'https://www2.illinois.gov/grants/',notes:'IL grants portal'},
  IN:{name:'Indiana',url:'https://www.in.gov/ocra/grants-and-loans/',notes:'IN OCRA grants'},
  IA:{name:'Iowa',url:'https://www.iowaeconomicdevelopment.com/grants',notes:'Iowa EDA grants'},
  KS:{name:'Kansas',url:'https://www.kansascommerce.gov/grants/',notes:'KS Commerce grants'},
  KY:{name:'Kentucky',url:'https://ced.ky.gov/Grants',notes:'KY CED grants'},
  LA:{name:'Louisiana',url:'https://www.opportunitylouisiana.gov/grants',notes:'LA grants'},
  ME:{name:'Maine',url:'https://www.maine.gov/dacf/grants.shtml',notes:'ME DACF grants'},
  MD:{name:'Maryland',url:'https://commerce.maryland.gov/fund/grant-programs',notes:'MD Commerce grants'},
  MA:{name:'Massachusetts',url:'https://www.mass.gov/grants',notes:'MA state grants'},
  MI:{name:'Michigan',url:'https://www.michigan.gov/leo/bureaus-agencies/osa/grants',notes:'MI grants'},
  MN:{name:'Minnesota',url:'https://mn.gov/deed/business/financing-business/deed-programs/grants/',notes:'MN DEED grants'},
  MS:{name:'Mississippi',url:'https://mississippi.gov/business/grants-and-financing/',notes:'MS grants'},
  MO:{name:'Missouri',url:'https://ded.mo.gov/grants',notes:'MO DED grants'},
  MT:{name:'Montana',url:'https://commerce.mt.gov/Grants',notes:'MT Commerce grants'},
  NE:{name:'Nebraska',url:'https://opportunity.nebraska.gov/programs/',notes:'NE opportunity grants'},
  NV:{name:'Nevada',url:'https://goed.nv.gov/incentives/grants/',notes:'NV GOED grants'},
  NH:{name:'New Hampshire',url:'https://www.nheconomy.com/grants',notes:'NH grants'},
  NJ:{name:'New Jersey',url:'https://www.njeda.com/programs/',notes:'NJEDA programs'},
  NM:{name:'New Mexico',url:'https://gonm.biz/grants-and-incentives/',notes:'NM grants'},
  NY:{name:'New York',url:'https://esd.ny.gov/doing-business-ny/financial-assistance',notes:'NY ESD financial assistance'},
  NC:{name:'North Carolina',url:'https://www.nccommerce.com/grants',notes:'NC Commerce grants'},
  ND:{name:'North Dakota',url:'https://www.commerce.nd.gov/main/grants',notes:'ND Commerce grants'},
  OH:{name:'Ohio',url:'https://development.ohio.gov/business/grants-and-loans',notes:'OH Development grants'},
  OK:{name:'Oklahoma',url:'https://www.okcommerce.gov/business-development/grants/',notes:'OK Commerce grants'},
  OR:{name:'Oregon',url:'https://www.oregon.gov/biz/pages/grants.aspx',notes:'OR Business grants'},
  PA:{name:'Pennsylvania',url:'https://dced.pa.gov/programs/?program_type=grants',notes:'PA DCED grants'},
  RI:{name:'Rhode Island',url:'https://riedc.com/financing-incentives',notes:'RI EDC grants'},
  SC:{name:'South Carolina',url:'https://sccommerce.com/growing-sc/grants-and-incentives',notes:'SC Commerce grants'},
  SD:{name:'South Dakota',url:'https://sdgoed.com/incentives/grants/',notes:'SD GOED grants'},
  TN:{name:'Tennessee',url:'https://www.tn.gov/ecd/redirect-to-topic.html',notes:'TN ECD programs'},
  TX:{name:'Texas',url:'https://gov.texas.gov/business/page/grants-and-economic-development',notes:'Texas Gov grants & economic development'},
  UT:{name:'Utah',url:'https://goed.utah.gov/programs/',notes:'UT GOED programs'},
  VT:{name:'Vermont',url:'https://accd.vermont.gov/economic-development/grants',notes:'VT ACCD grants'},
  VA:{name:'Virginia',url:'https://www.vedp.org/grants',notes:'VA EDP grants'},
  WA:{name:'Washington',url:'https://www.commerce.wa.gov/growing-the-economy/grants/',notes:'WA Commerce grants'},
  WV:{name:'West Virginia',url:'https://westvirginia.gov/business/grants/',notes:'WV grants'},
  WI:{name:'Wisconsin',url:'https://wedc.org/programs-and-resources/grants',notes:'WI WEDC grants'},
  WY:{name:'Wyoming',url:'https://wyomingbusiness.org/services/grants/',notes:'WY Business grants'},
  DC:{name:'Washington DC',url:'https://dmped.dc.gov/grants',notes:'DC DMPED grants'},
  PR:{name:'Puerto Rico',url:'https://www.prdoh.org/grants/',notes:'PR grants'},
}

function eligDefault(orgType?: string | null): string {
  if (orgType === 'for-profit' || orgType === 'startup') return 'for-profit'
  if (orgType === 'nonprofit')  return 'nonprofit'
  if (orgType === 'university') return 'higher-ed'
  if (orgType === 'government') return 'government'
  return 'all'
}

function resolveStateAbbrev(locationState?: string | null): string {
  if (!locationState) return ''
  const s = locationState.trim()
  if (s.length === 2) return s.toUpperCase()
  // Try to match full name to abbrev
  const entry = Object.entries(STATE_PORTALS).find(([, v]) =>
    v.name.toLowerCase() === s.toLowerCase()
  )
  return entry ? entry[0] : s.toUpperCase().slice(0, 2)
}

// ── Foundation card ───────────────────────────────────────────────────────────
function FoundationCard({ f }: { f: FoundationResult }) {
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-slate-300 hover:shadow-card-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="badge-foundation mb-2 inline-block">Foundation</span>
          <h3 className="font-sans font-semibold text-sm text-slate-900 line-clamp-2">{f.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <Building2 size={11} className="text-slate-400" />
            <span className="font-sans text-xs text-slate-500">{f.city}, {f.state}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {f.assets && (
          <div>
            <p className="font-mono font-semibold text-gold-600">{(f.assets/1e6).toFixed(1)}M</p>
            <p className="font-sans text-slate-500">Total assets</p>
          </div>
        )}
        {f.filingYear && (
          <div>
            <p className="font-mono font-semibold text-slate-700">{f.filingYear}</p>
            <p className="font-sans text-slate-500">Last 990 filing</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1 border-t border-slate-100 mt-auto">
        <a href={f.profileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-3 py-1.5">
          <ExternalLink size={12} /> View 990 History
        </a>
        {f.website && (
          <a href={f.website} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-1.5">
            Website
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Scope = 'federal' | 'state' | 'foundation'

export default function Grants() {
  const { user, profile } = useAuth()

  const [scope, setScope]             = useState<Scope>('federal')
  const [grants, setGrants]           = useState<Grant[]>([])
  const [foundations, setFoundations] = useState<FoundationResult[]>([])
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([])
  const [loading, setLoading]         = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [liveResult, setLiveResult]   = useState<LiveSearchResult | null>(null)
  const [isLive, setIsLive]           = useState(true)
  const [analyzingGrantor, setAnalyzingGrantor]   = useState<string | null>(null)
  const [pendingTrackGrant, setPendingTrackGrant] = useState<Grant | null>(null)
  const [aiMatching, setAiMatching]               = useState(false)
  const [aiError, setAiError]                     = useState('')
  const [matchScores, setMatchScores]             = useState<Map<string, { score: number; reasoning: string; key_strengths: string[]; gaps: string[] }>>(new Map())

  const [params, setParams] = useState<GrantSearchParams>({
    keyword: '', eligibility: 'all', page: 1, limit: 25,
  })

  // Smart eligibility default from profile org type
  useEffect(() => {
    if (profile?.org_type) setParams(p => ({ ...p, eligibility: eligDefault(profile.org_type), page: 1 }))
  }, [profile?.org_type])

  useEffect(() => { if (user) loadSaved() }, [user])
  useEffect(() => { fetchGrants() }, [params, scope])

  async function fetchGrants() {
    setLoading(true)
    setFoundations([])
    try {
      if (scope === 'foundation') {
        const EDGE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/foundation-search`
        const stateAbbrev = resolveStateAbbrev(profile?.location_state)
        const res = await fetch(EDGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: params.keyword || (profile?.industries?.slice(0,2).join(' ') ?? ''), state: stateAbbrev, page: params.page }),
        })
        const data = await res.json()
        setFoundations(data.foundations ?? [])
        setGrants([])
        setLiveResult(null)
        setIsLive(true)
      } else {
        const result = await searchGrantsLive(
          { ...params, scope } as GrantSearchParams & { scope: string },
          profile ? { industries: profile.industries, description: profile.description, org_type: profile.org_type, location_state: profile.location_state } : null,
        )
        setGrants(result.grants)
        setLiveResult(result)
        setIsLive(true)
        setFoundations([])
      }
    } catch {
      setIsLive(false)
      if (scope === 'federal') {
        const { data } = await supabase.from('grants').select('*').order('created_at', { ascending: false }).limit(params.limit ?? 25)
        setGrants(data ?? [])
      }
      setLiveResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadSaved() {
    const { data } = await supabase.from('saved_grants').select('*').eq('user_id', user!.id)
    setSavedGrants(data ?? [])
  }

  async function handleSave(grantId: string) {
    const grant = grants.find(g => g.id === grantId)
    if (!grant) return
    try {
      const dbId = await upsertLiveGrant(grant)
      await supabase.from('saved_grants').insert({ user_id: user!.id, grant_id: dbId })
      await loadSaved()
    } catch (e) { console.error('Save failed:', e) }
  }

  async function handleUnsave(grantId: string) {
    const externalId = String(grantId).replace(/^gg-/, '')
    const { data: dbGrant } = await supabase.from('grants').select('id').eq('external_id', externalId).maybeSingle()
    const realId   = dbGrant?.id ?? grantId
    const toDelete = savedGrants.find(s => s.grant_id === realId || s.grant_id === grantId)
    if (toDelete) { await supabase.from('saved_grants').delete().eq('id', toDelete.id); await loadSaved() }
  }

  function handleSearch(e: FormEvent) { e.preventDefault(); setParams(p => ({ ...p, page: 1 })) }
  function clearFilters() { setParams(p => ({ keyword: '', eligibility: p.eligibility, page: 1, limit: 25 })); setMatchScores(new Map()) }

  async function runAiMatching() {
    if (!profile || !grants.length) return
    setAiMatching(true)
    setAiError('')
    try {
      const scores = await getAiMatchesForGrants(
        profile as unknown as Record<string, unknown>,
        grants,
      )
      setMatchScores(scores)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI matching failed'
      setAiError(msg.includes('ANTHROPIC_API_KEY') ? 'Add ANTHROPIC_API_KEY to Supabase secrets to enable AI matching.' : msg)
    } finally {
      setAiMatching(false)
    }
  }

  const savedIds   = new Set(savedGrants.map(s => s.grant_id))
  const hasFilter  = !!(params.keyword)
  const totalPages = liveResult ? Math.ceil(liveResult.totalCount / (params.limit ?? 25)) : 1
  const stateAbbrev = resolveStateAbbrev(profile?.location_state)
  const statePortal = stateAbbrev ? STATE_PORTALS[stateAbbrev] : null

  return (
    <Layout>
      {analyzingGrantor && (
        <GrantorAnalysisModal agency={analyzingGrantor} onClose={() => setAnalyzingGrantor(null)} />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">Find Grants</h1>
            <div className="flex items-center gap-2 mt-1.5">
              {loading ? (
                <span className="flex items-center gap-1.5 font-sans text-xs text-slate-500">
                  Fetching live data...
                </span>
              ) : isLive && liveResult ? (
                <span className="flex items-center gap-1.5 font-mono text-xs text-teal-600">
                  <Wifi size={11} />
                  {liveResult.totalCount.toLocaleString()} live grants · Grants.gov
                </span>
              ) : scope === 'foundation' ? (
                <span className="flex items-center gap-1.5 font-mono text-xs text-teal-600">
                  <Wifi size={11} />
                  {foundations.length} foundations · ProPublica 990 data
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-mono text-xs text-amber-600">
                  <WifiOff size={11} /> Showing cached database
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scope === 'federal' && grants.length > 0 && profile?.description && (
              <button
                onClick={runAiMatching}
                disabled={aiMatching}
                className="btn-secondary text-xs border-gold-300 text-gold-700 hover:bg-gold-50"
                title="Score current results against your profile using Claude AI"
              >
                {aiMatching ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {aiMatching ? 'Scoring...' : matchScores.size > 0 ? 'Re-score with AI' : 'AI Match Score'}
              </button>
            )}
            <button className="btn-secondary text-xs shrink-0" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={13} /> Filters
            </button>
          </div>
        </div>

        {/* Scope tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['federal','state','foundation'] as Scope[]).map(s => (
            <button key={s} onClick={() => { setScope(s); setParams(p => ({ ...p, page: 1 })) }}
              className={`px-4 py-2 rounded-lg text-sm font-sans font-medium border transition-all duration-150 capitalize
                ${scope === s ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {s === 'federal' ? '🏛 Federal' : s === 'state' ? '🗺 State' : '🏦 Foundation'}
            </button>
          ))}
        </div>

        {/* Eligibility filter (federal/state only) */}
        {scope !== 'foundation' && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ELIG_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setParams(p => ({ ...p, eligibility: opt.value, page: 1 }))}
                title={opt.hint}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium border transition-all duration-150
                  ${params.eligibility === opt.value ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={params.keyword ?? ''} onChange={e => setParams(p => ({ ...p, keyword: e.target.value, page: 1 }))}
              className="input pl-10 pr-28 py-3 text-sm"
              placeholder={scope === 'foundation' ? 'Search foundations by name, cause, or keyword...' : 'Search by keyword, agency, program name...'}
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs px-4 py-1.5">Search</button>
          </div>
        </form>

        {/* Extended filters panel */}
        {showFilters && scope !== 'foundation' && (
          <div className="card p-4 mb-4 flex items-center justify-between gap-4">
            <p className="font-sans text-xs text-slate-500">Use the eligibility buttons above to filter by organization type.</p>
            {hasFilter && (
              <button onClick={clearFilters} className="btn-ghost text-xs text-slate-500">
                <X size={12} /> Clear search
              </button>
            )}
          </div>
        )}

        {/* State scope: show portal card for user's state */}
        {scope === 'state' && statePortal && (
          <div className="card p-4 mb-5 flex items-start gap-4 border-l-4 border-l-teal-500">
            <div className="flex-1">
              <p className="font-sans text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                {statePortal.name} State Grant Portal
              </p>
              <p className="font-sans text-sm font-semibold text-slate-900">{statePortal.notes}</p>
              <p className="font-sans text-xs text-slate-500 mt-0.5">
                State-funded grants are managed independently. Visit the portal directly for opportunities not on Grants.gov.
              </p>
            </div>
            <a href={statePortal.url} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs shrink-0">
              <ExternalLink size={12} /> Visit Portal
            </a>
          </div>
        )}

        {/* State scope: show all-states directory if no profile state */}
        {scope === 'state' && !statePortal && !profile?.location_state && (
          <div className="card p-5 mb-5">
            <p className="font-sans text-sm font-semibold text-slate-900 mb-1">Select your state in your profile to see your state portal</p>
            <p className="font-sans text-xs text-slate-500 mb-4">Or browse all 50 state grant portals below:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(STATE_PORTALS).map(([abbrev, portal]) => (
                <a key={abbrev} href={portal.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-sans text-slate-600 border border-slate-200 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-all duration-150">
                  <span className="font-mono font-bold text-slate-400">{abbrev}</span>
                  {portal.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI error */}
        {aiError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <Sparkles size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="font-sans text-xs text-amber-800">{aiError}</p>
          </div>
        )}

        {/* AI score legend when scores are present */}
        {matchScores.size > 0 && !aiMatching && (
          <div className="mb-4 flex items-center gap-4 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="flex items-center gap-1.5 font-sans text-xs text-slate-600">
              <Sparkles size={12} className="text-gold-500" />
              AI match scores active ({matchScores.size} grants scored)
            </span>
            <div className="flex items-center gap-3 ml-auto font-mono text-[11px]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-teal-100 border-2 border-teal-400 inline-block" /> 80+</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-100 border-2 border-amber-400 inline-block" /> 60–79</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-100 border-2 border-slate-300 inline-block" /> &lt;60</span>
            </div>
          </div>
        )}

        {/* Foundation note */}
        {scope === 'foundation' && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
            <p className="font-sans text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Data from ProPublica Nonprofit Explorer</span> — IRS Form 990 filings showing foundation assets, revenue, and filing history.
              Foundation opportunities are posted on each foundation's website directly. Click "View 990 History" to see who they've funded, then visit their site for open RFPs.
            </p>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 h-52 animate-pulse bg-slate-100" />)}
          </div>
        ) : scope === 'foundation' ? (
          foundations.length === 0 ? (
            <div className="card p-12 text-center">
              <Search size={32} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-slate-700 mb-2">No foundations found</h3>
              <p className="font-sans text-sm text-slate-500">Try different keywords or broaden your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {foundations.map(f => <FoundationCard key={f.ein} f={f} />)}
            </div>
          )
        ) : grants.length === 0 ? (
          <div className="card p-12 text-center">
            <Search size={32} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-slate-700 mb-2">No grants found</h3>
            <p className="font-sans text-sm text-slate-500 max-w-sm mx-auto">
              Try different keywords, a broader eligibility filter, or switch to the State or Foundation tab.
            </p>
            {hasFilter && <button onClick={clearFilters} className="btn-secondary text-sm mt-4 mx-auto w-fit"><X size={13} /> Clear search</button>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans text-xs text-slate-500">
                Showing {grants.length} of {(liveResult?.totalCount ?? grants.length).toLocaleString()}
              </p>
              {hasFilter && <button onClick={clearFilters} className="btn-ghost text-xs text-slate-500"><X size={11} /> Clear</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {grants
                .slice()
                .sort((a, b) => {
                  if (!matchScores.size) return 0
                  return (matchScores.get(b.id)?.score ?? -1) - (matchScores.get(a.id)?.score ?? -1)
                })
                .map(grant => {
                  const aiMatch = matchScores.get(grant.id)
                  return (
                    <GrantCard
                      key={grant.id} grant={grant} isLive={isLive}
                      isSaved={savedIds.has(grant.id)}
                      matchScore={aiMatch?.score}
                      matchReasoning={aiMatch?.reasoning}
                      onSave={handleSave} onUnsave={handleUnsave}
                      onAnalyzeGrantor={setAnalyzingGrantor}
                      onTrackApplication={setPendingTrackGrant}
                    />
                  )
                })}
            </div>

            {/* Pagination */}
            {liveResult && liveResult.totalCount > (params.limit ?? 25) && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button onClick={() => setParams(p => ({ ...p, page: Math.max((p.page ?? 1) - 1, 1) }))}
                  disabled={(params.page ?? 1) <= 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="font-mono text-xs text-slate-500">Page {params.page ?? 1} of {totalPages.toLocaleString()}</span>
                <button onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  disabled={(params.page ?? 1) >= totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Track application modal — pre-populated from grant */}
      {pendingTrackGrant && (
        <TrackApplicationModal grant={pendingTrackGrant} userId={user!.id} onClose={() => setPendingTrackGrant(null)} />
      )}
    </Layout>
  )
}

// ── Inline quick-track modal ──────────────────────────────────────────────────
function TrackApplicationModal({ grant, userId, onClose }: { grant: Grant; userId: string; onClose: () => void }) {
  const [status, setStatus] = useState('draft')
  const [amount, setAmount] = useState(grant.amount_max?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const dbId = await upsertLiveGrant(grant).catch(() => null)
    await supabase.from('applications').insert({
      user_id: userId, grant_id: dbId, grant_title: grant.title,
      status, amount_requested: amount ? Number(amount) : null,
      deadline: grant.deadline, updated_at: new Date().toISOString(),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">Track Application</h2>
            <p className="font-sans text-xs text-slate-500 mt-0.5 line-clamp-1">{grant.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input">
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>
          <div>
            <label className="label">Amount Requesting ($)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input" placeholder="e.g. 75000" min="0" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : 'Add to Applications'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
