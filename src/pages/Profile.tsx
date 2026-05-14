import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, CheckCircle, Bell, BellOff, Mail, Send, Loader } from 'lucide-react'
import Layout from '../components/Layout'
import IndustryTagInput from '../components/IndustryTagInput'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileType } from '../types'

// ── Notification prefs type ───────────────────────────────────────────────────
interface NotifPrefs {
  email_enabled:      boolean
  weekly_digest:      boolean
  new_opportunities:  boolean
  deadline_reminders: boolean
  deadline_days:      number[]
  digest_day:         number
}

const DEFAULT_PREFS: NotifPrefs = {
  email_enabled:      true,
  weekly_digest:      true,
  new_opportunities:  true,
  deadline_reminders: true,
  deadline_days:      [30, 7],
  digest_day:         1,
}

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200
        ${checked ? 'bg-navy-900' : 'bg-slate-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900'}`}
      role="switch" aria-checked={checked}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
        ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Notification settings section ────────────────────────────────────────────
function NotificationSettings({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [prefs, setPrefs]         = useState<NotifPrefs>(DEFAULT_PREFS)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle()
      if (data) setPrefs({
        email_enabled:      data.email_enabled,
        weekly_digest:      data.weekly_digest,
        new_opportunities:  data.new_opportunities,
        deadline_reminders: data.deadline_reminders,
        deadline_days:      data.deadline_days ?? [30, 7],
        digest_day:         data.digest_day ?? 1,
      })
      setLoading(false)
    })()
  }, [userId])

  async function savePrefs() {
    setSaving(true)
    await supabase.from('notification_preferences').upsert(
      { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  async function sendTestEmail() {
    setTesting(true)
    setTestResult('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-digest`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ test_user_id: userId }),
        }
      )
      const data = await res.json()
      const result = data.results?.[0]
      if (result?.status === 'sent')        setTestResult(`✓ Test email sent to ${userEmail}`)
      else if (result?.status === 'no_api_key') setTestResult('⚠ RESEND_API_KEY not configured — see setup instructions below.')
      else setTestResult(`✗ ${result?.reason ?? 'Send failed'}`)
    } catch (e) {
      setTestResult('✗ Could not reach edge function')
    } finally {
      setTesting(false)
    }
  }

  function toggle(key: keyof NotifPrefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  function toggleDay(d: number) {
    setPrefs(p => ({
      ...p,
      deadline_days: p.deadline_days.includes(d)
        ? p.deadline_days.filter(x => x !== d)
        : [...p.deadline_days, d].sort((a, b) => b - a),
    }))
  }

  if (loading) return <div className="card p-6 animate-pulse bg-slate-100 h-40" />

  return (
    <div className="card p-6 space-y-5">
      {/* Section header + master toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {prefs.email_enabled ? <Bell size={16} className="text-navy-700" /> : <BellOff size={16} className="text-slate-400" />}
          <h2 className="font-sans font-semibold text-slate-700 text-xs uppercase tracking-wider">Email Notifications</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-slate-500">{prefs.email_enabled ? 'Enabled' : 'Disabled'}</span>
          <Toggle checked={prefs.email_enabled} onChange={v => setPrefs(p => ({ ...p, email_enabled: v }))} />
        </div>
      </div>

      <p className="font-sans text-xs text-slate-500 -mt-2">
        Sent to <span className="font-medium text-slate-700">{userEmail}</span>
      </p>

      {/* Sub-settings */}
      <div className={`space-y-4 ${!prefs.email_enabled ? 'opacity-40 pointer-events-none' : ''}`}>

        {/* Weekly digest */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-sm font-medium text-slate-800">Weekly Grant Digest</p>
            <p className="font-sans text-xs text-slate-500 mt-0.5">Summary of saved grants, upcoming deadlines, and new opportunities matching your profile — sent every</p>
            <select
              value={prefs.digest_day}
              onChange={e => setPrefs(p => ({ ...p, digest_day: Number(e.target.value) }))}
              className="mt-1.5 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-navy-600"
            >
              {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <Toggle checked={prefs.weekly_digest} onChange={() => toggle('weekly_digest')} />
        </div>

        <div className="border-t border-slate-100" />

        {/* New opportunities */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-sm font-medium text-slate-800">New Opportunities</p>
            <p className="font-sans text-xs text-slate-500 mt-0.5">New federal and state grants that match your profile sectors — included in your weekly digest</p>
          </div>
          <Toggle checked={prefs.new_opportunities} onChange={() => toggle('new_opportunities')} />
        </div>

        <div className="border-t border-slate-100" />

        {/* Deadline reminders */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-sans text-sm font-medium text-slate-800">Deadline Reminders</p>
            <p className="font-sans text-xs text-slate-500 mt-0.5">Alert me when a saved grant is due in:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[60, 30, 14, 7, 3, 1].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150
                    ${prefs.deadline_days.includes(d)
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
          </div>
          <Toggle checked={prefs.deadline_reminders} onChange={() => toggle('deadline_reminders')} />
        </div>
      </div>

      {/* Save + Test buttons */}
      <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={savePrefs}
          disabled={saving}
          className="btn-primary text-sm py-2 px-5"
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
        </button>

        <button
          type="button"
          onClick={sendTestEmail}
          disabled={testing || !prefs.email_enabled}
          className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
          title="Send a test digest email to yourself right now"
        >
          {testing ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
          {testing ? 'Sending...' : 'Send Test Email'}
        </button>

        {testResult && (
          <p className={`font-sans text-xs ${testResult.startsWith('✓') ? 'text-teal-600' : testResult.startsWith('⚠') ? 'text-amber-600' : 'text-red-500'}`}>
            {testResult}
          </p>
        )}
      </div>

      {/* Setup callout */}
      <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-start gap-2">
          <Mail size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-xs font-semibold text-slate-700 mb-1">Email delivery setup</p>
            <p className="font-sans text-xs text-slate-500 leading-relaxed">
              To activate email sending, add your <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-navy-700 underline">Resend</a> API key as a Supabase secret:
            </p>
            <code className="block mt-1.5 px-3 py-2 rounded-lg bg-slate-900 text-teal-300 text-[11px] font-mono leading-relaxed">
              supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
            </code>
            <p className="font-sans text-xs text-slate-400 mt-1.5">
              Resend is free for up to 3,000 emails/month. Weekly digest runs every {DAYS_OF_WEEK[prefs.digest_day]} at 8:00 AM UTC.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ORG_TYPES = [
  { value: 'nonprofit',   label: 'Nonprofit / 501(c)(3)' },
  { value: 'for-profit',  label: 'For-Profit Business' },
  { value: 'startup',     label: 'Startup / Early Stage' },
  { value: 'government',  label: 'Government Agency' },
  { value: 'university',  label: 'University / Research Institution' },
  { value: 'individual',  label: 'Individual / Freelancer' },
  { value: 'other',       label: 'Other' },
]

const BUDGET_RANGES = [
  { value: '',         label: 'Select range' },
  { value: '0',        label: 'Pre-revenue / $0' },
  { value: '50000',    label: 'Under $50K' },
  { value: '250000',   label: '$50K – $250K' },
  { value: '1000000',  label: '$250K – $1M' },
  { value: '5000000',  label: '$1M – $5M' },
  { value: '10000000', label: '$5M+' },
]

export default function Profile() {
  const { user, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState<Partial<ProfileType>>({
    org_name: '', org_type: null, description: '', mission: '',
    industries: [], location_state: '', location_city: '',
    annual_budget: null, employee_count: null, website: '', ein: '',
    founded_year: null,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        org_name: profile.org_name ?? '', org_type: profile.org_type ?? null,
        description: profile.description ?? '', mission: profile.mission ?? '',
        industries: profile.industries ?? [], location_state: profile.location_state ?? '',
        location_city: profile.location_city ?? '', annual_budget: profile.annual_budget ?? null,
        employee_count: profile.employee_count ?? null, website: profile.website ?? '',
        ein: profile.ein ?? '', founded_year: profile.founded_year ?? null,
      })
    }
  }, [profile])

  const currentYear = new Date().getFullYear()
  const orgAgeYears = form.founded_year ? currentYear - form.founded_year : null
  const ageWarning  = orgAgeYears !== null && orgAgeYears < 1
    ? 'Organizations under 1 year old are ineligible for most federal grants. Focus on SBIR Phase I and foundation grants.'
    : orgAgeYears !== null && orgAgeYears < 2
    ? 'Many federal programs require 2+ years of operating history. Your profile will flag ineligible grants automatically.'
    : null

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value || null }))
    }
  }

  function validateWebsite(url: string | null | undefined): string | null {
    if (!url) return null
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
      return url
    } catch {
      return null
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setSaving(true)

    const payload = {
      user_id: user.id,
      org_name: form.org_name || null, org_type: form.org_type || null,
      description: form.description || null, mission: form.mission || null,
      industries: form.industries ?? [], location_state: form.location_state || null,
      location_city: form.location_city || null, annual_budget: form.annual_budget ?? null,
      employee_count: form.employee_count ?? null, website: validateWebsite(form.website),
      ein: form.ein || null, founded_year: form.founded_year ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles').upsert(payload, { onConflict: 'user_id' }).select().single()

    if (error) {
      setError(error.message)
    } else {
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (!profile) navigate('/grants')
    }
    setSaving(false)
  }

  const isSetup = !profile

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          {isSetup && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-50 border border-gold-200 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
              <span className="font-mono text-xs text-gold-700">Step 1 of 1 — Tell us about your organization</span>
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">
            {isSetup ? 'Set up your profile' : 'Organization Profile'}
          </h1>
          <p className="font-sans text-sm text-slate-600 mt-2 leading-relaxed">
            {isSetup
              ? 'This helps our AI find grants that genuinely fit your work. No sector is excluded — describe your organization freely.'
              : 'Keep this current. Our AI uses your profile to match and score grants.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization basics */}
          <div className="card p-6 space-y-5">
            <h2 className="font-sans font-semibold text-slate-700 text-xs uppercase tracking-wider">Organization</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Organization Name</label>
                <input type="text" value={form.org_name ?? ''} onChange={set('org_name')}
                  className="input" placeholder="Your organization's legal name" />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Organization Type</label>
                <select value={form.org_type ?? ''} onChange={set('org_type')} className="input">
                  <option value="">Select type...</option>
                  {ORG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">City</label>
                <input type="text" value={form.location_city ?? ''} onChange={set('location_city')}
                  className="input" placeholder="City" />
              </div>

              <div>
                <label className="label">State</label>
                <input type="text" value={form.location_state ?? ''} onChange={set('location_state')}
                  className="input" placeholder="e.g. California, Texas..." />
              </div>

              <div>
                <label className="label">Annual Budget</label>
                <select
                  value={form.annual_budget?.toString() ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, annual_budget: e.target.value ? Number(e.target.value) : null }))}
                  className="input"
                >
                  {BUDGET_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Employees / Team Size</label>
                <input type="number"
                  value={form.employee_count ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, employee_count: e.target.value ? Number(e.target.value) : null }))}
                  className="input" placeholder="e.g. 12" min="0" />
              </div>

              <div>
                <label className="label" htmlFor="founded-year">Year Founded</label>
                <input
                  id="founded-year"
                  type="number"
                  value={form.founded_year ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, founded_year: e.target.value ? Number(e.target.value) : null }))}
                  className="input" placeholder={`e.g. ${currentYear - 3}`}
                  min="1900" max={currentYear} />
                {ageWarning && (
                  <p className="mt-1.5 font-sans text-xs text-amber-600">{ageWarning}</p>
                )}
              </div>

              <div>
                <label className="label">Website (optional)</label>
                <input type="url" value={form.website ?? ''} onChange={set('website')}
                  className="input" placeholder="https://yourorg.org" />
              </div>

              <div>
                <label className="label">EIN (optional)</label>
                <input type="text" value={form.ein ?? ''} onChange={set('ein')}
                  className="input" placeholder="XX-XXXXXXX" />
              </div>
            </div>
          </div>

          {/* Sectors */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-sans font-semibold text-slate-700 text-xs uppercase tracking-wider mb-0.5">Sectors & Focus Areas</h2>
              <p className="font-sans text-xs text-slate-500">Your work sectors — used by AI to match relevant grants. No preset list.</p>
            </div>
            <IndustryTagInput
              value={form.industries ?? []}
              onChange={(tags) => setForm((f) => ({ ...f, industries: tags }))}
              placeholder="e.g. Clean Energy, Veterans Services, EdTech..."
            />
          </div>

          {/* Mission & Description */}
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="font-sans font-semibold text-slate-700 text-xs uppercase tracking-wider mb-0.5">Mission & Description</h2>
              <p className="font-sans text-xs text-slate-500">Our AI reads these to understand your work and explain why specific grants fit you.</p>
            </div>

            <div>
              <label className="label">What does your organization do?</label>
              <textarea
                value={form.description ?? ''}
                onChange={set('description')}
                className="input resize-none h-28"
                placeholder="Describe your programs, services, or products in plain language. What problem do you solve? Who do you serve?"
              />
            </div>

            <div>
              <label className="label">Mission Statement (optional)</label>
              <textarea
                value={form.mission ?? ''}
                onChange={set('mission')}
                className="input resize-none h-20"
                placeholder="Your organization's mission or vision statement"
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
              <p className="font-sans text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary py-3 px-8">
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : saved ? 'Saved!' : isSetup ? 'Save & Find Grants' : 'Save Profile'}
            </button>
            {saved && (
              <span className="font-sans text-sm text-teal-600 flex items-center gap-1.5">
                <CheckCircle size={14} />
                Profile updated
              </span>
            )}
          </div>
        </form>

        {/* Email notification preferences — shown after initial setup */}
        {!isSetup && user && (
          <div className="mt-8">
            <NotificationSettings userId={user.id} userEmail={user.email ?? ''} />
          </div>
        )}
      </div>
    </Layout>
  )
}
