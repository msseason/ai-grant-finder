import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    if (password.length < 8)   { setError('Password must be at least 8 characters.'); return }
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/profile` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-600">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 mb-3">Check your email</h2>
          <p className="font-sans text-sm text-slate-600 leading-relaxed">
            We've sent a confirmation link to <span className="text-gold-600 font-medium">{email}</span>.
            Click it to activate your account, then set up your organization profile.
          </p>
          <Link to="/login" className="btn-secondary mt-8 mx-auto w-fit">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — intentionally dark for contrast */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-navy-900 border-r border-navy-700 p-10 shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 11 L8 3 L13 11" stroke="#06091A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 8.5 L11.5 8.5" stroke="#06091A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display text-lg font-semibold text-white">Grant<span className="text-gold-400">Finder</span></span>
        </Link>

        <div className="space-y-6">
          <div>
            <p className="font-mono text-xs text-gold-500 uppercase tracking-widest mb-3">What you get</p>
            <div className="space-y-4">
              {[
                { label: 'Live federal & state grants',   sub: 'Synced from Grants.gov, SBIR, and more' },
                { label: 'AI matching for any sector',    sub: 'Nonprofits, startups, farms, clinics, studios...' },
                { label: 'Grantor analysis engine',       sub: 'Past awards, winning patterns, red flags' },
                { label: 'Application portfolio',         sub: 'Track every grant from search to award' },
              ].map(({ label, sub }) => (
                <div key={label} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                  </div>
                  <div>
                    <p className="font-sans text-sm font-medium text-white">{label}</p>
                    <p className="font-sans text-xs text-slate-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <p className="font-sans text-xs text-teal-300">
              No credit card required. Free to start. Any organization type welcome.
            </p>
          </div>
        </div>

        <p className="font-sans text-xs text-slate-500">© {new Date().getFullYear()} AI Grant Finder</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 11 L8 3 L13 11" stroke="#06091A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.5 8.5 L11.5 8.5" stroke="#06091A" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-display text-base font-semibold text-slate-900">Grant<span className="text-gold-600">Finder</span></span>
            </Link>
            <h1 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">Create your account</h1>
            <p className="font-sans text-sm text-slate-500 mt-2">Start finding grants in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@organization.org"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Minimum 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="input"
                placeholder="Repeat password"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                <p className="font-sans text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="font-sans text-sm text-slate-500 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-600 hover:text-gold-700 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
