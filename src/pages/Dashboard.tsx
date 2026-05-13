import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText, TrendingUp, Clock, ArrowRight, AlertCircle, Wifi } from 'lucide-react'
import Layout from '../components/Layout'
import GrantCard from '../components/GrantCard'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Application, Grant, SavedGrant } from '../types'
import { daysUntilDeadline, searchGrantsLive, upsertLiveGrant } from '../lib/grantsApi'

const STATUS_COLORS: Record<string, string> = {
  draft:        'text-slate-600 bg-slate-100 border-slate-200',
  submitted:    'text-amber-700 bg-amber-50 border-amber-200',
  under_review: 'text-teal-700 bg-teal-50 border-teal-200',
  awarded:      'text-green-700 bg-green-50 border-green-200',
  rejected:     'text-red-700 bg-red-50 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  draft:        'Draft',
  submitted:    'Submitted',
  under_review: 'Under Review',
  awarded:      'Awarded',
  rejected:     'Rejected',
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [recentGrants, setRecentGrants]   = useState<Grant[]>([])
  const [savedGrants, setSavedGrants]     = useState<SavedGrant[]>([])
  const [applications, setApplications]   = useState<Application[]>([])
  const [loading, setLoading]             = useState(true)
  const [liveCount, setLiveCount]         = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([loadGrants(), loadSavedGrants(), loadApplications()])
      .finally(() => setLoading(false))
  }, [user])

  async function loadGrants() {
    try {
      const result = await searchGrantsLive(
        { limit: 4, page: 1 },
        profile ? { industries: profile.industries, org_type: profile.org_type } : null,
      )
      setRecentGrants(result.grants)
      setLiveCount(result.totalCount)
    } catch {
      // fallback to DB
      const { data } = await supabase
        .from('grants').select('*').order('created_at', { ascending: false }).limit(4)
      setRecentGrants(data ?? [])
    }
  }

  async function loadSavedGrants() {
    const { data } = await supabase
      .from('saved_grants').select('*, grant:grants(*)')
      .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20)
    setSavedGrants(data ?? [])
  }

  async function loadApplications() {
    const { data } = await supabase
      .from('applications').select('*, grant:grants(*)')
      .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10)
    setApplications(data ?? [])
  }

  async function handleSave(grantId: string) {
    const grant = recentGrants.find(g => g.id === grantId)
    if (!grant) return
    const dbId = await upsertLiveGrant(grant)
    await supabase.from('saved_grants').insert({ user_id: user!.id, grant_id: dbId })
    loadSavedGrants()
  }

  async function handleUnsave(grantId: string) {
    const externalId = String(grantId).replace(/^gg-/, '')
    const { data: dbGrant } = await supabase.from('grants').select('id').eq('external_id', externalId).maybeSingle()
    const realId = dbGrant?.id ?? grantId
    const sg = savedGrants.find(s => s.grant_id === realId || s.grant_id === grantId)
    if (sg) await supabase.from('saved_grants').delete().eq('id', sg.id)
    loadSavedGrants()
  }

  const savedIds       = new Set(savedGrants.map((s) => s.grant_id))
  const totalPipeline  = applications.reduce((sum, a) => sum + (a.amount_requested ?? 0), 0)
  const awarded        = applications.filter((a) => a.status === 'awarded')
  const totalAwarded   = awarded.reduce((sum, a) => sum + (a.amount_requested ?? 0), 0)

  const upcomingDeadlines = savedGrants
    .filter((s) => s.grant?.deadline && daysUntilDeadline(s.grant.deadline, s.grant!.is_rolling) !== 'Closed')
    .sort((a, b) => new Date(a.grant!.deadline!).getTime() - new Date(b.grant!.deadline!).getTime())
    .slice(0, 4)

  const profileIncomplete = !profile?.org_name || !profile?.description || !profile?.industries?.length

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">
            {profile?.org_name ? `Welcome back, ${profile.org_name}` : 'Dashboard'}
          </h1>
          <p className="font-sans text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Profile incomplete banner */}
        {profileIncomplete && (
          <div className="mb-6 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-sans font-medium text-sm text-amber-800">Complete your profile to unlock AI matching</p>
                <p className="font-sans text-xs text-amber-600 mt-0.5">Add your sectors, description, and location to get personalized grant recommendations.</p>
              </div>
            </div>
            <Link to="/profile" className="btn-primary text-xs px-4 py-2 shrink-0">
              Set Up Profile
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { value: liveCount ? liveCount.toLocaleString() : recentGrants.length > 0 ? '—' : '0', label: liveCount ? 'Live Federal Grants' : 'Available Grants', icon: liveCount ? Wifi : Search, color: 'gold' },
            { value: savedGrants.length.toString(),           label: 'Saved Grants',     icon: FileText,   color: 'teal' },
            { value: applications.length.toString(),          label: 'Applications',     icon: TrendingUp, color: 'gold' },
            {
              value: totalAwarded > 0 ? `$${(totalAwarded / 1000).toFixed(0)}K` : '$0',
              label: 'Total Awarded', icon: TrendingUp, color: 'teal',
            },
          ].map(({ value, label, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                  ${color === 'gold' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                  <Icon size={15} className={color === 'gold' ? 'text-amber-600' : 'text-teal-600'} />
                </div>
              </div>
              <p className="stat-value">{loading ? '—' : value}</p>
              <p className="stat-label">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent grants column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-heading">Recent Grants</h2>
              <Link to="/grants" className="btn-ghost text-xs text-slate-500">
                Browse all
                <ArrowRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-5 h-36 animate-pulse bg-slate-100" />
                ))}
              </div>
            ) : recentGrants.length === 0 ? (
              <div className="card p-8 text-center">
                <Search size={24} className="text-slate-300 mx-auto mb-3" />
                <p className="font-sans text-sm text-slate-600">No grants in database yet.</p>
                <p className="font-sans text-xs text-slate-400 mt-1">Use "Find Grants" to sync from Grants.gov.</p>
                <Link to="/grants" className="btn-secondary text-xs mt-4 mx-auto w-fit">
                  Find Grants
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGrants.map((grant) => (
                  <GrantCard
                    key={grant.id}
                    grant={grant}
                    isSaved={savedIds.has(grant.id)}
                    onSave={handleSave}
                    onUnsave={handleUnsave}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Upcoming deadlines */}
            <div>
              <h2 className="section-heading mb-4">Upcoming Deadlines</h2>
              {upcomingDeadlines.length === 0 ? (
                <div className="card p-5 text-center">
                  <Clock size={20} className="text-slate-300 mx-auto mb-2" />
                  <p className="font-sans text-xs text-slate-500">Save grants to track deadlines here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((sg) => {
                    const dl     = daysUntilDeadline(sg.grant!.deadline, sg.grant!.is_rolling)
                    const urgent = dl.includes('day') && !dl.includes('week')
                    return (
                      <div key={sg.id} className="card p-4 flex items-start gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${urgent ? 'bg-amber-500' : 'bg-teal-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs font-medium text-slate-700 line-clamp-2">
                            {sg.grant!.title}
                          </p>
                          <p className={`font-mono text-xs mt-1 ${urgent ? 'text-amber-600' : 'text-slate-500'}`}>
                            {dl}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent applications */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-heading">Applications</h2>
                <Link to="/applications" className="btn-ghost text-xs text-slate-500">
                  View all
                  <ArrowRight size={13} />
                </Link>
              </div>
              {applications.length === 0 ? (
                <div className="card p-5 text-center">
                  <FileText size={20} className="text-slate-300 mx-auto mb-2" />
                  <p className="font-sans text-xs text-slate-500">No applications tracked yet.</p>
                  <Link to="/applications" className="btn-secondary text-xs mt-3 mx-auto w-fit">
                    Track an Application
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {applications.slice(0, 4).map((app) => (
                    <div key={app.id} className="card p-4">
                      <p className="font-sans text-xs font-medium text-slate-700 line-clamp-1 mb-2">
                        {app.grant_title ?? app.grant?.title ?? 'Untitled Grant'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${STATUS_COLORS[app.status]}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                        {app.amount_requested && (
                          <span className="font-mono text-xs text-gold-600 font-semibold">
                            ${(app.amount_requested / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pipeline summary */}
            {totalPipeline > 0 && (
              <div className="card p-5 bg-navy-950 border-navy-800">
                <p className="font-sans text-xs text-slate-400 mb-1">Total Pipeline</p>
                <p className="font-mono text-2xl font-semibold text-gold-400">
                  ${totalPipeline.toLocaleString()}
                </p>
                <p className="font-sans text-xs text-slate-500 mt-1">
                  Across {applications.length} application{applications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
