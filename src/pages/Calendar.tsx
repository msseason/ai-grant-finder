import { useState, useEffect, FormEvent } from 'react'
import { Plus, X, Calendar as CalIcon, Clock, Users, Video, RefreshCw, Bell } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { daysUntilDeadline } from '../lib/grantsApi'
import type { CalendarEvent, SavedGrant } from '../types'

const EVENT_TYPES = [
  { value: 'deadline',      label: 'Grant Deadline',     icon: Clock,      color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'milestone',     label: 'Internal Milestone', icon: CalIcon,    color: 'text-navy-600 bg-navy-50 border-navy-100' },
  { value: 'meeting',       label: 'Program Officer Call',icon: Users,     color: 'text-gold-700 bg-gold-50 border-gold-200' },
  { value: 'webinar',       label: 'Grantor Webinar',    icon: Video,      color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { value: 'resubmission',  label: 'Resubmission Window',icon: RefreshCw, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'reminder',      label: 'Reminder',           icon: Bell,       color: 'text-slate-600 bg-slate-100 border-slate-200' },
]

function typeInfo(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[5]
}

function relativeDate(dateStr: string): string {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  if (days < 0)   return `${Math.abs(days)} days ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7)  return `In ${days} days`
  if (days <= 30) return `In ${Math.ceil(days/7)} weeks`
  if (days <= 90) return `In ${Math.floor(days/30)} months`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function groupByMonth(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  events.forEach(e => {
    const key = new Date(e.event_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  })
  return map
}

interface EventForm {
  title: string; event_type: string; event_date: string
  grant_title: string; agency: string; notes: string
}

const emptyForm: EventForm = {
  title: '', event_type: 'meeting', event_date: '', grant_title: '', agency: '', notes: '',
}

export default function Calendar() {
  const { user } = useAuth()
  const [events, setEvents]       = useState<CalendarEvent[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState<EventForm>(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [filter, setFilter]       = useState<string>('all')
  const [syncing, setSyncing]     = useState(false)

  useEffect(() => { if (user) { loadEvents(); syncFromSavedGrants() } }, [user])

  async function loadEvents() {
    const { data } = await supabase
      .from('calendar_events').select('*').eq('user_id', user!.id)
      .order('event_date', { ascending: true })
    setEvents(data ?? [])
    setLoading(false)
  }

  // Auto-generate milestone events from saved grants (30-day and 7-day warnings)
  async function syncFromSavedGrants() {
    setSyncing(true)
    const { data: saved } = await supabase
      .from('saved_grants').select('*, grant:grants(*)')
      .eq('user_id', user!.id)
    if (!saved?.length) { setSyncing(false); return }

    const toInsert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] = []

    for (const sg of saved) {
      const grant = sg.grant
      if (!grant?.deadline || grant.is_rolling) continue
      const deadline = new Date(grant.deadline)
      const days = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)
      if (days < 0 || days > 365) continue

      const existingDeadline = events.find(e => e.grant_id === grant.id && e.event_type === 'deadline')
      if (!existingDeadline) {
        toInsert.push({
          user_id: user!.id, title: `Deadline: ${grant.title}`,
          event_type: 'deadline', event_date: grant.deadline,
          grant_id: grant.id, grant_title: grant.title,
          agency: grant.provider ?? null, notes: null, is_auto: true,
        })
      }

      // 30-day prep milestone
      if (days > 5) {
        const prepDate = new Date(deadline)
        prepDate.setDate(prepDate.getDate() - 30)
        if (prepDate > new Date()) {
          const prepStr = prepDate.toISOString().split('T')[0]
          const existingPrep = events.find(e => e.grant_id === grant.id && e.event_type === 'milestone' && e.event_date === prepStr)
          if (!existingPrep) {
            toInsert.push({
              user_id: user!.id, title: `30-day prep: Start ${grant.title}`,
              event_type: 'milestone', event_date: prepStr,
              grant_id: grant.id, grant_title: grant.title,
              agency: grant.provider ?? null, notes: 'Begin drafting narrative, gather required documents, contact program officer.',
              is_auto: true,
            })
          }
        }
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('calendar_events').insert(toInsert as CalendarEvent[])
      await loadEvents()
    }
    setSyncing(false)
  }

  function set(k: keyof EventForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title || !form.event_date) return
    setSaving(true)
    await supabase.from('calendar_events').insert({
      user_id:     user!.id,
      title:       form.title,
      event_type:  form.event_type,
      event_date:  form.event_date,
      grant_title: form.grant_title || null,
      agency:      form.agency || null,
      notes:       form.notes || null,
      is_auto:     false,
    })
    await loadEvents()
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(ev => ev.filter(e => e.id !== id))
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter)
  const upcoming = filtered.filter(e => new Date(e.event_date) >= new Date(new Date().toDateString()))
  const past     = filtered.filter(e => new Date(e.event_date) < new Date(new Date().toDateString()))
  const grouped  = groupByMonth(upcoming)

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">Strategic Calendar</h1>
            <p className="font-sans text-sm text-slate-500 mt-1">
              Deadlines, prep milestones, program officer calls, and webinars in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => syncFromSavedGrants()} disabled={syncing}
              className="btn-secondary text-xs" title="Auto-generate milestones from saved grants">
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Grants'}
            </button>
            <button onClick={() => { setForm(emptyForm); setShowForm(true) }} className="btn-primary text-sm">
              <Plus size={15} /> Add Event
            </button>
          </div>
        </div>

        {/* Event type filter */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === 'all' ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            All Events ({events.length})
          </button>
          {EVENT_TYPES.map(t => {
            const count = events.filter(e => e.event_type === t.value).length
            return (
              <button key={t.value} onClick={() => setFilter(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === t.value ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {t.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Add event form */}
        {showForm && (
          <div className="card p-6 mb-6 border-gold-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-sans font-semibold text-slate-900">Add Calendar Event</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Event Title *</label>
                <input value={form.title} onChange={set('title')} className="input" placeholder="e.g. Call with NSF program officer" required />
              </div>
              <div>
                <label className="label">Event Type *</label>
                <select value={form.event_type} onChange={set('event_type')} className="input">
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" value={form.event_date} onChange={set('event_date')} className="input" required />
              </div>
              <div>
                <label className="label">Grant Name (optional)</label>
                <input value={form.grant_title} onChange={set('grant_title')} className="input" placeholder="Related grant title" />
              </div>
              <div>
                <label className="label">Agency / Funder (optional)</label>
                <input value={form.agency} onChange={set('agency')} className="input" placeholder="e.g. NSF, Ford Foundation" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={set('notes')} className="input resize-none h-20"
                  placeholder="Agenda, dial-in info, questions to ask, documents needed..." />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Event'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Calendar timeline */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}</div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div className="card p-12 text-center">
            <CalIcon size={32} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-slate-700 mb-2">No events yet</h3>
            <p className="font-sans text-sm text-slate-500 mb-4">
              Save grants to auto-generate deadline and prep milestones, or add events manually.
            </p>
            <button onClick={() => { setForm(emptyForm); setShowForm(true) }} className="btn-primary mx-auto w-fit">
              <Plus size={15} /> Add First Event
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming — grouped by month */}
            {Array.from(grouped.entries()).map(([month, evs]) => (
              <div key={month}>
                <h2 className="font-display text-lg font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">{month}</h2>
                <div className="space-y-2">
                  {evs.map(ev => <EventRow key={ev.id} event={ev} onDelete={handleDelete} />)}
                </div>
              </div>
            ))}

            {/* Past events (collapsed) */}
            {past.length > 0 && (
              <details className="group">
                <summary className="font-sans text-sm text-slate-400 cursor-pointer hover:text-slate-600 select-none list-none flex items-center gap-2">
                  <span className="text-xs">▶</span> {past.length} past event{past.length !== 1 ? 's' : ''}
                </summary>
                <div className="mt-3 space-y-2 opacity-50">
                  {past.map(ev => <EventRow key={ev.id} event={ev} onDelete={handleDelete} />)}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function EventRow({ event, onDelete }: { event: CalendarEvent; onDelete: (id: string) => void }) {
  const info = typeInfo(event.event_type)
  const Icon = info.icon
  const isPast = new Date(event.event_date) < new Date(new Date().toDateString())

  return (
    <div className={`card p-4 flex items-start gap-4 hover:border-slate-300 transition-all duration-150 ${isPast ? 'opacity-60' : ''}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${info.color}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-slate-900 line-clamp-1">{event.title}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="font-mono text-xs text-slate-500">
                {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className={`font-mono text-xs font-medium ${isPast ? 'text-slate-400' : 'text-teal-600'}`}>
                {relativeDate(event.event_date)}
              </span>
              {event.grant_title && <span className="font-sans text-xs text-slate-400 truncate">· {event.grant_title}</span>}
              {event.is_auto && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">auto</span>}
            </div>
            {event.notes && <p className="font-sans text-xs text-slate-500 mt-1 line-clamp-1">{event.notes}</p>}
          </div>
          {!event.is_auto && (
            <button onClick={() => onDelete(event.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 p-1">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
