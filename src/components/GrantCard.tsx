import { ExternalLink, Bookmark, BookmarkCheck, Clock, Building2, Tag, Wifi, TrendingUp, PlusCircle } from 'lucide-react'
import type { Grant } from '../types'
import { formatAmount, daysUntilDeadline } from '../lib/grantsApi'

/** Only allow http/https URLs to prevent javascript: URI injection */
function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

interface GrantCardProps {
  grant:               Grant
  matchScore?:         number
  matchReasoning?:     string
  isSaved?:            boolean
  isLive?:             boolean
  onSave?:             (grantId: string) => void
  onUnsave?:           (grantId: string) => void
  onAnalyzeGrantor?:   (agency: string) => void
  onTrackApplication?: (grant: Grant) => void
}

function GrantTypeBadge({ type }: { type: string | null }) {
  const classes: Record<string, string> = {
    Federal:    'badge-federal',
    State:      'badge-state',
    Foundation: 'badge-foundation',
    Corporate:  'badge-corporate',
    Other:      'badge-foundation',
  }
  return <span className={classes[type ?? 'Other'] ?? 'badge-foundation'}>{type ?? 'Other'}</span>
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-teal-700 border-teal-400 bg-teal-50' :
    score >= 60 ? 'text-amber-700 border-amber-400 bg-amber-50' :
                  'text-slate-500 border-slate-300 bg-slate-100'
  return (
    <div className={`score-ring border-2 ${color}`}>
      <span className="text-xs">{score}</span>
    </div>
  )
}

// Format CFDA numbers into readable category labels
function formatCategory(cat: string): string {
  // CFDA numbers like "47.076" — show as-is but trim
  if (/^\d+\.\d+$/.test(cat)) return `CFDA ${cat}`
  return cat.length > 24 ? cat.slice(0, 22) + '…' : cat
}

export default function GrantCard({
  grant, matchScore, matchReasoning, isSaved, isLive, onSave, onUnsave, onAnalyzeGrantor, onTrackApplication,
}: GrantCardProps) {
  const deadline  = daysUntilDeadline(grant.deadline, grant.is_rolling)
  const amount    = formatAmount(grant.amount_min, grant.amount_max)
  const isClosed  = deadline === 'Closed'
  const liveGrant = isLive || String(grant.id).startsWith('gg-') || grant.source?.includes('grants')

  return (
    <div className={`card p-5 flex flex-col gap-3.5 hover:border-slate-300 hover:shadow-card-md transition-all duration-200 hover:-translate-y-px ${isClosed ? 'opacity-60' : ''}`}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <GrantTypeBadge type={grant.type} />
            {liveGrant && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-teal-50 text-teal-600 border border-teal-200">
                <Wifi size={8} />
                Live
              </span>
            )}
            {grant.categories.slice(0, 2).map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans bg-slate-100 text-slate-500 border border-slate-200">
                <Tag size={9} />
                {formatCategory(cat)}
              </span>
            ))}
          </div>
          <h3 className="font-sans font-semibold text-sm text-slate-900 leading-snug line-clamp-2">
            {grant.title}
          </h3>
          {grant.provider && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 size={11} className="text-slate-400 shrink-0" />
              <span className="font-sans text-xs text-slate-500 truncate">{grant.provider}</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 shrink-0">
          {matchScore !== undefined && <ScoreRing score={matchScore} />}
          {(onSave || onUnsave) && (
            <button
              onClick={() => isSaved ? onUnsave?.(grant.id) : onSave?.(grant.id)}
              className={`p-2 rounded-lg transition-all duration-150
                ${isSaved
                  ? 'text-gold-600 bg-gold-50 hover:bg-gold-100'
                  : 'text-slate-400 hover:text-gold-600 hover:bg-gold-50'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400`}
              title={isSaved ? 'Unsave' : 'Save grant'}
            >
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Amount & Deadline ── */}
      <div className="flex items-center gap-4">
        <div>
          <p className={`font-mono text-base font-semibold ${grant.amount_min || grant.amount_max ? 'text-gold-600' : 'text-slate-500 text-sm'}`}>
            {amount}
          </p>
          <p className="font-sans text-xs text-slate-500">Funding</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div>
          <div className="flex items-center gap-1">
            <Clock size={12} className={
              isClosed              ? 'text-red-500' :
              deadline.includes('day') ? 'text-amber-600' :
                                       'text-slate-400'
            } />
            <p className={`font-mono text-sm font-medium ${
              isClosed              ? 'text-red-500' :
              deadline.includes('day') ? 'text-amber-600' :
                                       'text-slate-700'
            }`}>
              {deadline}
            </p>
          </div>
          <p className="font-sans text-xs text-slate-500">Deadline</p>
        </div>
      </div>

      {/* ── AI reasoning ── */}
      {matchReasoning && (
        <div className="px-3 py-2.5 rounded-lg bg-teal-50 border border-teal-200">
          <p className="font-sans text-xs text-teal-700 leading-relaxed">{matchReasoning}</p>
        </div>
      )}

      {/* ── Eligibility / description snippet ── */}
      {grant.eligibility && !matchReasoning && (
        <p className="font-sans text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {grant.eligibility}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 mt-auto">
        {isSafeUrl(grant.application_url) && (
          <a href={grant.application_url!} target="_blank" rel="noopener noreferrer"
            className="btn-primary text-xs px-3.5 py-1.5">
            <ExternalLink size={13} />
            {liveGrant ? 'View on Grants.gov' : 'Apply'}
          </a>
        )}
        {!isSaved && onSave && (
          <button onClick={() => onSave(grant.id)} className="btn-secondary text-xs px-3.5 py-1.5">
            <Bookmark size={13} /> Save
          </button>
        )}
        {isSaved && onTrackApplication && (
          <button onClick={() => onTrackApplication(grant)}
            className="btn-secondary text-xs px-3.5 py-1.5 text-teal-700 border-teal-200 hover:bg-teal-50">
            <PlusCircle size={13} /> Track
          </button>
        )}
        {grant.provider && onAnalyzeGrantor && (
          <button onClick={() => onAnalyzeGrantor(grant.provider!)}
            className="btn-ghost text-xs px-3 py-1.5 text-slate-500 hover:text-navy-700"
            title="Analyze this grantor's funding history">
            <TrendingUp size={13} /> Analyze
          </button>
        )}
      </div>
    </div>
  )
}
