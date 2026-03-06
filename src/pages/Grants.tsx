import { useState, useEffect, FormEvent } from 'react'
import { Search, SlidersHorizontal, RefreshCw, Sparkles, X } from 'lucide-react'
import Layout from '../components/Layout'
import GrantCard from '../components/GrantCard'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { searchGrants, syncGrantsFromGovApi, type GrantSearchParams } from '../lib/grantsApi'
import type { Grant, SavedGrant } from '../types'

const GRANT_TYPES = ['Federal', 'State', 'Foundation', 'Corporate', 'Other']

export default function Grants() {
  const { user, profile } = useAuth()
  const [grants, setGrants] = useState<Grant[]>([])
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const [params, setParams] = useState<GrantSearchParams>({
    keyword: '',
    type: '',
    page: 1,
    limit: 20,
  })

  useEffect(() => {
    if (!user) return
    loadSaved()
    loadGrants()
  }, [user])

  useEffect(() => {
    loadGrants()
  }, [params])

  async function loadGrants() {
    setLoading(true)
    try {
      const data = await searchGrants(params)
      setGrants(data)

      const { count } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true })
      setTotalCount(count ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadSaved() {
    const { data } = await supabase
      .from('saved_grants')
      .select('*')
      .eq('user_id', user!.id)
    setSavedGrants(data ?? [])
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const keyword = profile?.industries?.[0] ?? profile?.description?.split(' ').slice(0, 3).join(' ') ?? ''
      const synced = await syncGrantsFromGovApi(keyword)
      setSyncMsg(`Synced ${synced} new grants from Grants.gov`)
      loadGrants()
    } catch {
      setSyncMsg('Sync unavailable — edge function not deployed yet. See setup guide.')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 5000)
    }
  }

  async function handleSave(grantId: string) {
    await supabase.from('saved_grants').insert({ user_id: user!.id, grant_id: grantId })
    loadSaved()
  }

  async function handleUnsave(grantId: string) {
    const sg = savedGrants.find((s) => s.grant_id === grantId)
    if (sg) await supabase.from('saved_grants').delete().eq('id', sg.id)
    loadSaved()
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setParams((p) => ({ ...p, page: 1 }))
  }

  function clearFilters() {
    setParams({ keyword: '', type: '', page: 1, limit: 20 })
  }

  const savedIds = new Set(savedGrants.map((s) => s.grant_id))
  const hasFilters = params.keyword || params.type

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-100 tracking-tight">Find Grants</h1>
            <p className="font-sans text-sm text-slate-500 mt-1">
              {totalCount > 0 ? `${totalCount.toLocaleString()} grants in database` : 'Search and discover funding opportunities'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-secondary text-xs"
              title="Sync new grants from Grants.gov (requires edge function)"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Grants.gov'}
            </button>
            <button
              className="btn-secondary text-xs"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={13} />
              Filters
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <p className="font-sans text-sm text-teal-300">{syncMsg}</p>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={params.keyword ?? ''}
              onChange={(e) => setParams((p) => ({ ...p, keyword: e.target.value, page: 1 }))}
              className="input pl-10 pr-24 py-3 text-sm"
              placeholder="Search by keyword, organization, category, or eligibility..."
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs px-4 py-1.5">
              Search
            </button>
          </div>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-4">
            <div>
              <label className="label text-[10px]">Grant Type</label>
              <div className="flex flex-wrap gap-1.5">
                {GRANT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setParams((p) => ({ ...p, type: p.type === t ? '' : t, page: 1 }))}
                    className={`px-3 py-1 rounded-full text-xs font-sans font-medium border transition-all duration-150
                      ${params.type === t
                        ? 'bg-gold-500/20 border-gold-500/40 text-gold-300'
                        : 'bg-navy-700 border-navy-500 text-slate-400 hover:border-navy-400 hover:text-slate-300'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost text-xs text-slate-500 ml-auto">
                <X size={12} />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Profile-based hint */}
        {profile?.industries?.length === 0 && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-navy-800 border border-navy-600 flex items-center gap-3">
            <Sparkles size={15} className="text-gold-400 shrink-0" />
            <p className="font-sans text-xs text-slate-400">
              <span className="text-gold-400 font-medium">Tip:</span>{' '}
              Add your sectors and description to your{' '}
              <a href="/profile" className="underline hover:text-slate-300">profile</a>{' '}
              to get AI-matched grant recommendations.
            </p>
          </div>
        )}

        {/* Grant grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-5 h-52 animate-pulse bg-navy-700/50" />
            ))}
          </div>
        ) : grants.length === 0 ? (
          <div className="card p-12 text-center">
            <Search size={32} className="text-slate-600 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-slate-300 mb-2">No grants found</h3>
            <p className="font-sans text-sm text-slate-500 max-w-sm mx-auto">
              {totalCount === 0
                ? 'Your grant database is empty. Click "Sync Grants.gov" to pull live federal grants, or add grants manually.'
                : 'Try different keywords or clear your filters.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-secondary text-sm mt-4 mx-auto w-fit">
                <X size={13} />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans text-xs text-slate-500">{grants.length} result{grants.length !== 1 ? 's' : ''}</p>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-ghost text-xs text-slate-500">
                  <X size={11} />
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {grants.map((grant) => (
                <GrantCard
                  key={grant.id}
                  grant={grant}
                  isSaved={savedIds.has(grant.id)}
                  onSave={handleSave}
                  onUnsave={handleUnsave}
                />
              ))}
            </div>

            {/* Pagination */}
            {grants.length === params.limit && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  className="btn-secondary"
                >
                  Load more grants
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
