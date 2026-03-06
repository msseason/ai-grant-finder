import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-navy-800 border-r border-navy-700 p-10 shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 11 L8 3 L13 11" stroke="#06091A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 8.5 L11.5 8.5" stroke="#06091A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display text-lg font-semibold text-slate-100">Grant<span className="text-gold-400">Finder</span></span>
        </Link>

        <div>
          <p className="font-display text-3xl font-semibold text-slate-100 leading-snug tracking-tight mb-4 italic">
            "Average success rate without analysis: 10–15%. With grantor intelligence: 50–60%."
          </p>
          <p className="font-sans text-sm text-slate-500">— Built on 10 years of grant expertise</p>
        </div>

        <div className="space-y-3">
          {['Access 10,000+ live grants', 'AI matching for any sector', 'Grantor pattern analysis', 'Portfolio tracking'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              </div>
              <span className="font-sans text-sm text-slate-400">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 11 L8 3 L13 11" stroke="#06091A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.5 8.5 L11.5 8.5" stroke="#06091A" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-display text-base font-semibold text-slate-100">Grant<span className="text-gold-400">Finder</span></span>
            </Link>
            <h1 className="font-display text-3xl font-semibold text-slate-100 tracking-tight">Welcome back</h1>
            <p className="font-sans text-sm text-slate-500 mt-2">Sign in to your account</p>
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
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="font-sans text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="font-sans text-sm text-slate-500 text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gold-400 hover:text-gold-300 transition-colors font-medium">
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
