import { useState, useEffect, FormEvent } from 'react'
import { Plus, X, TrendingUp, DollarSign, CheckCircle, Clock } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Application } from '../types'

const STATUSES = [
  { value: 'draft', label: 'Draft', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'submitted', label: 'Submitted', color: 'text-gold-400 bg-gold-500/10 border-gold-500/20' },
  { value: 'under_review', label: 'Under Review', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { value: 'awarded', label: 'Awarded ✓', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
]

interface AppForm {
  grant_title: string
  status: string
  amount_requested: string
  deadline: string
  submitted_at: string
  notes: string
}

const emptyForm: AppForm = {
  grant_title: '',
  status: 'draft',
  amount_requested: '',
  deadline: '',
  submitted_at: '',
  notes: '',
}

export default function Applications() {
  const { user } = useAuth()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AppForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (!user) return
    loadApps()
  }, [user])

  async function loadApps() {
    const { data } = await supabase
      .from('applications')
      .select('*, grant:grants(*)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    setApps(data ?? [])
    setLoading(false)
  }

  function set(key: keyof AppForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function startEdit(app: Application) {
    setEditId(app.id)
    setForm({
      grant_title: app.grant_title ?? app.grant?.title ?? '',
      status: app.status,
      amount_requested: app.amount_requested?.toString() ?? '',
      deadline: app.deadline ?? '',
      submitted_at: app.submitted_at ? app.submitted_at.split('T')[0] : '',
      notes: app.notes ?? '',
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const payload = {
      user_id: user.id,
      grant_title: form.grant_title,
      status: form.status,
      amount_requested: form.amount_requested ? Number(form.amount_requested) : null,
      deadline: form.deadline || null,
      submitted_at: form.submitted_at ? new Date(form.submitted_at).toISOString() : null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }

    if (editId) {
      await supabase.from('applications').update(payload).eq('id', editId)
    } else {
      await supabase.from('applications').insert(payload)
    }

    await loadApps()
    cancelForm()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this application?')) return
    await supabase.from('applications').delete().eq('id', id)
    setApps((a) => a.filter((x) => x.id !== id))
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setApps((a) => a.map((x) => x.id === id ? { ...x, status: status as Application['status'] } : x))
  }

  const filtered = filterStatus ? apps.filter((a) => a.status === filterStatus) : apps
  const totalPipeline = apps.reduce((s, a) => s + (a.amount_requested ?? 0), 0)
  const totalAwarded = apps.filter((a) => a.status === 'awarded').reduce((s, a) => s + (a.amount_requested ?? 0), 0)
  const successRate = apps.length > 0
    ? Math.round((apps.filter((a) => a.status === 'awarded').length / apps.filter((a) => a.status !== 'draft').length) * 100) || 0
    : 0

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-100 tracking-tight">Applications</h1>
            <p className="font-sans text-sm text-slate-500 mt-1">Track every grant from search to award</p>
          </div>
          <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true) }} className="btn-primary">
            <Plus size={15} />
            Track Application
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { value: apps.length.toString(), label: 'Total', icon: TrendingUp },
            { value: `$${(totalPipeline / 1000).toFixed(0)}K`, label: 'Pipeline', icon: DollarSign },
            { value: `$${(totalAwarded / 1000).toFixed(0)}K`, label: 'Awarded', icon: CheckCircle },
            { value: `${successRate}%`, label: 'Success Rate', icon: Clock },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="card p-4">
              <Icon size={14} className="text-gold-400 mb-2" />
              <p className="stat-value text-lg">{loading ? '—' : value}</p>
              <p className="stat-label">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium border transition-all duration-150
              ${filterStatus === '' ? 'bg-gold-500/15 border-gold-500/30 text-gold-300' : 'bg-navy-700 border-navy-500 text-slate-400 hover:text-slate-300'}`}
          >
            All ({apps.length})
          </button>
          {STATUSES.map(({ value, label }) => {
            const count = apps.filter((a) => a.status === value).length
            return (
              <button
                key={value}
                onClick={() => setFilterStatus(filterStatus === value ? '' : value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium border transition-all duration-150
                  ${filterStatus === value ? 'bg-gold-500/15 border-gold-500/30 text-gold-300' : 'bg-navy-700 border-navy-500 text-slate-400 hover:text-slate-300'}`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div className="card p-6 mb-6 border-gold-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-sans font-semibold text-slate-200">{editId ? 'Edit Application' : 'Track New Application'}</h2>
              <button onClick={cancelForm} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Grant Name *</label>
                <input
                  type="text"
                  value={form.grant_title}
                  onChange={set('grant_title')}
                  className="input"
                  placeholder="Grant title or funder name"
                  required
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={set('status')} className="input">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount Requested ($)</label>
                <input
                  type="number"
                  value={form.amount_requested}
                  onChange={set('amount_requested')}
                  className="input"
                  placeholder="e.g. 50000"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Deadline</label>
                <input type="date" value={form.deadline} onChange={set('deadline')} className="input" />
              </div>
              <div>
                <label className="label">Submitted Date</label>
                <input type="date" value={form.submitted_at} onChange={set('submitted_at')} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  className="input resize-none h-20"
                  placeholder="Program officer contact, login credentials location, reviewer feedback..."
                />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : editId ? 'Update' : 'Add Application'}
                </button>
                <button type="button" onClick={cancelForm} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Applications list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-navy-700/50" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <TrendingUp size={28} className="text-slate-600 mx-auto mb-3" />
            <p className="font-sans text-sm text-slate-500">
              {apps.length === 0 ? 'No applications tracked yet. Add your first one above.' : 'No applications match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => {
              const statusInfo = STATUSES.find((s) => s.value === app.status)
              return (
                <div key={app.id} className="card p-5 hover:border-navy-500 transition-all duration-150">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${statusInfo?.color}`}>
                          {statusInfo?.label}
                        </span>
                        {app.deadline && (
                          <span className="font-mono text-xs text-slate-500">
                            Due {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h3 className="font-sans font-semibold text-sm text-slate-200">
                        {app.grant_title ?? app.grant?.title ?? 'Unnamed Grant'}
                      </h3>
                      {app.notes && (
                        <p className="font-sans text-xs text-slate-500 mt-1 line-clamp-1">{app.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {app.amount_requested && (
                        <span className="font-mono text-sm font-semibold text-gold-400">
                          ${app.amount_requested.toLocaleString()}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          className="text-xs bg-navy-700 border border-navy-500 text-slate-400 rounded-lg px-2 py-1 focus:outline-none focus:border-gold-500"
                        >
                          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button onClick={() => startEdit(app)} className="btn-ghost text-xs px-2 py-1">Edit</button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="btn-ghost text-xs px-2 py-1 text-slate-600 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
