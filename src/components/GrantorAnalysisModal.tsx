import { useState, useEffect } from 'react'
import { X, TrendingUp, AlertTriangle, Building2, MapPin, Users } from 'lucide-react'

interface GrantorData {
  agency:          string
  totalAwards:     number
  totalAmountFmt:  string
  avgAwardFmt:     string
  minFmt:          string
  maxFmt:          string
  dataRange:       string
  topRecipients:   { name: string; amountFmt: string }[]
  stateBreakdown:  { state: string; amountFmt: string }[]
  recentAwards:    { title: string; recipient: string; amountFmt: string; date: string; state: string }[]
  redFlags:        string[]
  error?:          string
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grantor-analysis`

export default function GrantorAnalysisModal({ agency, onClose }: { agency: string; onClose: () => void }) {
  const [data, setData]       = useState<GrantorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(EDGE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ agency }),
    })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [agency])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-navy-600" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 leading-tight">{agency}</h2>
              <p className="font-sans text-xs text-slate-500">Grantor Intelligence · USASpending.gov</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-slate-100 rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle size={28} className="text-amber-500 mx-auto mb-3" />
              <p className="font-sans text-sm text-slate-600">Could not load grantor data.</p>
              <p className="font-sans text-xs text-slate-400 mt-1">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Data range note */}
              <p className="font-mono text-xs text-slate-400">Data range: {data.dataRange}</p>

              {/* Red flags */}
              {data.redFlags.length > 0 && (
                <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-sans text-xs font-semibold text-amber-800 mb-1">Watch out</p>
                      {data.redFlags.map((f, i) => (
                        <p key={i} className="font-sans text-xs text-amber-700">{f}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Awards',  value: data.totalAwards.toString(), icon: TrendingUp },
                  { label: 'Total Awarded', value: data.totalAmountFmt,         icon: TrendingUp },
                  { label: 'Avg Award',     value: data.avgAwardFmt,            icon: TrendingUp },
                  { label: 'Range',         value: `${data.minFmt}–${data.maxFmt}`, icon: TrendingUp },
                ].map(({ label, value }) => (
                  <div key={label} className="card p-4">
                    <p className="font-mono text-base font-semibold text-gold-600">{value}</p>
                    <p className="font-sans text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Top recipients */}
              {data.topRecipients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-slate-500" />
                    <h3 className="font-sans text-sm font-semibold text-slate-700">Top Recipients (3 yr)</h3>
                  </div>
                  <div className="space-y-1.5">
                    {data.topRecipients.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-sans text-xs text-slate-700 truncate flex-1 mr-3">{r.name}</span>
                        <span className="font-mono text-xs font-semibold text-gold-600 shrink-0">{r.amountFmt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State breakdown */}
              {data.stateBreakdown.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-slate-500" />
                    <h3 className="font-sans text-sm font-semibold text-slate-700">Geographic Distribution</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.stateBreakdown.map(s => (
                      <div key={s.state} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                        <span className="font-mono text-xs font-semibold text-slate-600">{s.state}</span>
                        <span className="font-sans text-xs text-slate-500">{s.amountFmt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent awards */}
              {data.recentAwards.length > 0 && (
                <div>
                  <h3 className="font-sans text-sm font-semibold text-slate-700 mb-3">Recent Awards</h3>
                  <div className="space-y-2">
                    {data.recentAwards.map((a, i) => (
                      <div key={i} className="card p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-xs font-medium text-slate-800 line-clamp-1">{a.title || a.recipient}</p>
                            <p className="font-sans text-xs text-slate-500 mt-0.5">{a.recipient} · {a.state} · {a.date}</p>
                          </div>
                          <span className="font-mono text-xs font-semibold text-gold-600 shrink-0">{a.amountFmt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
