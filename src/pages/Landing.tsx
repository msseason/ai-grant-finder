import { Link } from 'react-router-dom'
import { ArrowRight, Zap, BarChart3, Target, Calendar, Shield, TrendingUp } from 'lucide-react'
import Navbar from '../components/Navbar'

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Matching',
    desc: 'Describe your organization in plain English. Our AI reads your mission and finds grants with explained match scores — not just a number.',
    accent: 'gold',
  },
  {
    icon: BarChart3,
    title: 'Grantor Intelligence',
    desc: 'See exactly what each grantor has funded over 3–5 years. Uncover winning team patterns, budget norms, and red flags before you apply.',
    accent: 'teal',
  },
  {
    icon: Target,
    title: 'Success Predictor',
    desc: 'Know your probability of winning before you invest weeks in an application. Get specific improvement recommendations to raise your score.',
    accent: 'gold',
  },
  {
    icon: Calendar,
    title: 'Strategic Calendar',
    desc: "Never miss a deadline. Track webinars, pre-application meetings, resubmission windows, and reviewer periods — not just due dates.",
    accent: 'teal',
  },
  {
    icon: Shield,
    title: 'Compliance Tracker',
    desc: 'Monitor SAM.gov registration, Grants.gov credentials, insurance requirements, and audit schedules automatically.',
    accent: 'gold',
  },
  {
    icon: TrendingUp,
    title: 'Portfolio Manager',
    desc: 'Track every application. Analyze your success rate by grant type. Calculate ROI per grant. Optimize your funding strategy over time.',
    accent: 'teal',
  },
]

const stats = [
  { value: '10,000+', label: 'Active Grants' },
  { value: '50%', label: 'Avg Success Rate with AI' },
  { value: '70%', label: 'Won on Resubmission' },
  { value: '$0', label: 'Cost to Start' },
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-24 px-4 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(201,162,68,0.3) 40px, rgba(201,162,68,0.3) 41px),
                repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(201,162,68,0.3) 40px, rgba(201,162,68,0.3) 41px)`,
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/8 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            <span className="font-mono text-xs text-gold-400 tracking-wider uppercase">AI Grant Intelligence Platform</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-700 text-slate-100 leading-[1.05] tracking-tighter mb-6 animate-fade-up">
            Find & Win Grants
            <br />
            <span className="text-gold-400 italic">With Intelligence</span>
          </h1>

          <p className="font-sans text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up animate-stagger-1" style={{ animationFillMode: 'both' }}>
            Access thousands of federal, state, foundation, and corporate grants —
            matched to your organization by AI. Track applications. Analyze grantors.
            Win more funding, faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animate-stagger-2" style={{ animationFillMode: 'both' }}>
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5 animate-pulse-gold">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-navy-700/50 rounded-2xl overflow-hidden border border-navy-700/50 animate-fade-up animate-stagger-3" style={{ animationFillMode: 'both' }}>
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-navy-800/80 px-6 py-5 text-center">
                <p className="font-mono text-2xl font-semibold text-gold-400">{value}</p>
                <p className="font-sans text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expert insight banner */}
      <section className="py-12 px-4 border-y border-navy-700/40 bg-navy-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-6">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <TrendingUp size={22} className="text-gold-400" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-slate-200 mb-1 italic">
                "70% of grants are won on resubmission. Grants with partnerships win 60% more often. Calling a program officer increases your success rate by 35%."
              </p>
              <p className="font-sans text-sm text-slate-500">— 10 years of grant writing experience, distilled into every feature</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-xs text-gold-500 uppercase tracking-widest mb-3">Expert Features</p>
            <h2 className="font-display text-4xl font-semibold text-slate-100 tracking-tight">
              Everything you need to win
            </h2>
            <p className="font-sans text-slate-400 mt-3 max-w-xl mx-auto leading-relaxed">
              Built around real grant expertise — not just a database. Each feature is designed to increase your success rate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, accent }, i) => (
              <div
                key={title}
                className="card p-6 hover:border-navy-500 transition-all duration-200 hover:-translate-y-px group"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
                  ${accent === 'gold' ? 'bg-gold-500/10 border border-gold-500/20' : 'bg-teal-500/10 border border-teal-500/20'}`}>
                  <Icon size={18} className={accent === 'gold' ? 'text-gold-400' : 'text-teal-400'} />
                </div>
                <h3 className="font-sans font-semibold text-slate-100 mb-2">{title}</h3>
                <p className="font-sans text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-10 bg-gradient-to-b from-navy-700/80 to-navy-800/80">
            <h2 className="font-display text-4xl font-semibold text-slate-100 tracking-tight mb-4">
              Ready to fund your mission?
            </h2>
            <p className="font-sans text-slate-400 leading-relaxed mb-8">
              Any organization type. Any sector. Any state. Sign up free and find grants that actually fit your work.
            </p>
            <Link to="/signup" className="btn-primary text-base px-10 py-3.5">
              Find My Grants
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 11 L8 3 L13 11" stroke="#06091A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 8.5 L11.5 8.5" stroke="#06091A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display text-sm font-semibold text-slate-400">GrantFinder</span>
          </div>
          <p className="font-sans text-xs text-slate-600">
            © {new Date().getFullYear()} AI Grant Finder. Built for organizations that change the world.
          </p>
        </div>
      </footer>
    </div>
  )
}
