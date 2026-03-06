import { ExternalLink, Bookmark, BookmarkCheck, Clock, Building2, Tag } from 'lucide-react'
import type { Grant } from '../types'
import { formatAmount, daysUntilDeadline } from '../lib/grantsApi'

interface GrantCardProps {
  grant: Grant
  matchScore?: number
  matchReasoning?: string
  isSaved?: boolean
  onSave?: (grantId: string) => void
  onUnsave?: (grantId: string) => void
}

function GrantTypeBadge({ type }: { type: string | null }) {
  const classes: Record<string, string> = {
    Federal: 'badge-federal',
    State: 'badge-state',
    Foundation: 'badge-foundation',
    Corporate: 'badge-corporate',
    Other: 'badge-foundation',
  }
  return (
    <span className={classes[type ?? 'Other'] ?? 'badge-foundation'}>
      {type ?? 'Other'}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? 'text-teal-400 border-teal-500/40 bg-teal-500/10'
    : score >= 60 ? 'text-gold-400 border-gold-500/40 bg-gold-500/10'
    : 'text-slate-400 border-slate-500/40 bg-slate-500/10'

  return (
    <div className={`score-ring border-2 ${color}`}>
      <span className="text-xs">{score}</span>
    </div>
  )
}

export default function GrantCard({
  grant,
  matchScore,
  matchReasoning,
  isSaved,
  onSave,
  onUnsave,
}: GrantCardProps) {
  const deadline = daysUntilDeadline(grant.deadline, grant.is_rolling)
  const amount = formatAmount(grant.amount_min, grant.amount_max)
  const isClosed = deadline === 'Closed'

  return (
    <div className={`card p-5 flex flex-col gap-4 hover:border-navy-500 transition-all duration-200 hover:-translate-y-px hover:shadow-navy-lg ${isClosed ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <GrantTypeBadge type={grant.type} />
            {grant.categories.slice(0, 2).map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans bg-navy-700 text-slate-400 border border-navy-600">
                <Tag size={9} />
                {cat}
              </span>
            ))}
          </div>
          <h3 className="font-sans font-semibold text-sm text-slate-100 leading-snug line-clamp-2">
            {grant.title}
          </h3>
          {grant.provider && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 size={11} className="text-slate-500 shrink-0" />
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
                  ? 'text-gold-400 bg-gold-500/10 hover:bg-gold-500/20'
                  : 'text-slate-500 hover:text-gold-400 hover:bg-navy-700'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500`}
              title={isSaved ? 'Unsave grant' : 'Save grant'}
            >
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Amount & Deadline row */}
      <div className="flex items-center gap-4">
        <div>
          <p className="font-mono text-base font-semibold text-gold-400">{amount}</p>
          <p className="font-sans text-xs text-slate-500">Funding amount</p>
        </div>
        <div className="w-px h-8 bg-navy-600" />
        <div>
          <div className="flex items-center gap-1">
            <Clock size={12} className={isClosed ? 'text-red-400' : deadline.includes('day') ? 'text-gold-400' : 'text-slate-400'} />
            <p className={`font-mono text-sm font-medium ${isClosed ? 'text-red-400' : deadline.includes('day') ? 'text-gold-400' : 'text-slate-300'}`}>
              {deadline}
            </p>
          </div>
          <p className="font-sans text-xs text-slate-500">Deadline</p>
        </div>
      </div>

      {/* AI Match reasoning */}
      {matchReasoning && (
        <div className="px-3 py-2.5 rounded-lg bg-teal-500/5 border border-teal-500/15">
          <p className="font-sans text-xs text-teal-300/80 leading-relaxed">{matchReasoning}</p>
        </div>
      )}

      {/* Eligibility snippet */}
      {grant.eligibility && !matchReasoning && (
        <p className="font-sans text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {grant.eligibility}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-navy-700/50 mt-auto">
        {grant.application_url && (
          <a
            href={grant.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs px-3.5 py-1.5"
          >
            <ExternalLink size={13} />
            Apply
          </a>
        )}
        {!isSaved && onSave && (
          <button
            onClick={() => onSave(grant.id)}
            className="btn-secondary text-xs px-3.5 py-1.5"
          >
            <Bookmark size={13} />
            Save
          </button>
        )}
      </div>
    </div>
  )
}
