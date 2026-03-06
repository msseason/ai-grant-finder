import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, CheckCircle } from 'lucide-react'
import Layout from '../components/Layout'
import IndustryTagInput from '../components/IndustryTagInput'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileType } from '../types'

const ORG_TYPES = [
  { value: 'nonprofit', label: 'Nonprofit / 501(c)(3)' },
  { value: 'for-profit', label: 'For-Profit Business' },
  { value: 'startup', label: 'Startup / Early Stage' },
  { value: 'government', label: 'Government Agency' },
  { value: 'university', label: 'University / Research Institution' },
  { value: 'individual', label: 'Individual / Freelancer' },
  { value: 'other', label: 'Other' },
]

const BUDGET_RANGES = [
  { value: '', label: 'Select range' },
  { value: '0', label: 'Pre-revenue / $0' },
  { value: '50000', label: 'Under $50K' },
  { value: '250000', label: '$50K – $250K' },
  { value: '1000000', label: '$250K – $1M' },
  { value: '5000000', label: '$1M – $5M' },
  { value: '10000000', label: '$5M+' },
]

export default function Profile() {
  const { user, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<Partial<ProfileType>>({
    org_name: '',
    org_type: null,
    description: '',
    mission: '',
    industries: [],
    location_state: '',
    location_city: '',
    annual_budget: null,
    employee_count: null,
    website: '',
    ein: '',
  })

  useEffect(() => {
    if (profile) {
      setForm({
        org_name: profile.org_name ?? '',
        org_type: profile.org_type ?? null,
        description: profile.description ?? '',
        mission: profile.mission ?? '',
        industries: profile.industries ?? [],
        location_state: profile.location_state ?? '',
        location_city: profile.location_city ?? '',
        annual_budget: profile.annual_budget ?? null,
        employee_count: profile.employee_count ?? null,
        website: profile.website ?? '',
        ein: profile.ein ?? '',
      })
    }
  }, [profile])

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value || null }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setSaving(true)

    const payload = {
      user_id: user.id,
      org_name: form.org_name || null,
      org_type: form.org_type || null,
      description: form.description || null,
      mission: form.mission || null,
      industries: form.industries ?? [],
      location_state: form.location_state || null,
      location_city: form.location_city || null,
      annual_budget: form.annual_budget ?? null,
      employee_count: form.employee_count ?? null,
      website: form.website || null,
      ein: form.ein || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <span className="font-mono text-xs text-gold-400">Step 1 of 1 — Tell us about your organization</span>
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold text-slate-100 tracking-tight">
            {isSetup ? 'Set up your profile' : 'Organization Profile'}
          </h1>
          <p className="font-sans text-sm text-slate-500 mt-2 leading-relaxed">
            {isSetup
              ? 'This helps our AI find grants that genuinely fit your work. No sector is excluded — describe your organization freely.'
              : 'Keep this current. Our AI uses your profile to match and score grants.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization basics */}
          <div className="card p-6 space-y-5">
            <h2 className="font-sans font-semibold text-slate-200 text-sm uppercase tracking-wider">Organization</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Organization Name</label>
                <input
                  type="text"
                  value={form.org_name ?? ''}
                  onChange={set('org_name')}
                  className="input"
                  placeholder="Your organization's legal name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Organization Type</label>
                <select
                  value={form.org_type ?? ''}
                  onChange={set('org_type')}
                  className="input"
                >
                  <option value="">Select type...</option>
                  {ORG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  value={form.location_city ?? ''}
                  onChange={set('location_city')}
                  className="input"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  value={form.location_state ?? ''}
                  onChange={set('location_state')}
                  className="input"
                  placeholder="e.g. California, Texas..."
                />
              </div>

              <div>
                <label className="label">Annual Budget</label>
                <select
                  value={form.annual_budget?.toString() ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, annual_budget: e.target.value ? Number(e.target.value) : null }))}
                  className="input"
                >
                  {BUDGET_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Employees / Team Size</label>
                <input
                  type="number"
                  value={form.employee_count ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, employee_count: e.target.value ? Number(e.target.value) : null }))}
                  className="input"
                  placeholder="e.g. 12"
                  min="0"
                />
              </div>

              <div>
                <label className="label">Website (optional)</label>
                <input
                  type="url"
                  value={form.website ?? ''}
                  onChange={set('website')}
                  className="input"
                  placeholder="https://yourorg.org"
                />
              </div>

              <div>
                <label className="label">EIN (optional)</label>
                <input
                  type="text"
                  value={form.ein ?? ''}
                  onChange={set('ein')}
                  className="input"
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Sectors — key innovation: free tags */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-sans font-semibold text-slate-200 text-sm uppercase tracking-wider mb-0.5">Sectors & Focus Areas</h2>
              <p className="font-sans text-xs text-slate-500">Your work sectors — used by AI to match relevant grants. No preset list.</p>
            </div>
            <IndustryTagInput
              value={form.industries ?? []}
              onChange={(tags) => setForm((f) => ({ ...f, industries: tags }))}
              placeholder="e.g. Clean Energy, Veterans Services, EdTech..."
            />
          </div>

          {/* Mission & Description — the AI reads these */}
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="font-sans font-semibold text-slate-200 text-sm uppercase tracking-wider mb-0.5">Mission & Description</h2>
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
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="font-sans text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-3 px-8"
            >
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : saved ? 'Saved!' : isSetup ? 'Save & Find Grants' : 'Save Profile'}
            </button>
            {saved && (
              <span className="font-sans text-sm text-teal-400 flex items-center gap-1.5">
                <CheckCircle size={14} />
                Profile updated
              </span>
            )}
          </div>
        </form>
      </div>
    </Layout>
  )
}
