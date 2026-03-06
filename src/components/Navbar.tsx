import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, FileText, User, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/grants', label: 'Find Grants', icon: Search },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-navy-700/60 bg-navy-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center shadow-gold-sm group-hover:shadow-gold-md transition-shadow duration-200">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 11 L8 3 L13 11" stroke="#06091A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 8.5 L11.5 8.5" stroke="#06091A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display text-lg font-semibold text-slate-100 tracking-tight">
              Grant<span className="text-gold-400">Finder</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-sans font-medium transition-all duration-150
                    ${location.pathname === to
                      ? 'bg-navy-700 text-gold-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-navy-800'
                    }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
                    <span className="font-mono text-xs text-gold-400 font-semibold">
                      {(profile?.org_name ?? user.email ?? 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-sans text-slate-400 max-w-[140px] truncate">
                    {profile?.org_name ?? user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="hidden md:flex btn-ghost text-slate-500 hover:text-red-400 text-xs px-3 py-1.5"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
                <button
                  className="md:hidden p-2 text-slate-400 hover:text-slate-100"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm px-4 py-2">Sign in</Link>
                <Link to="/signup" className="btn-primary text-sm px-4 py-2">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {user && menuOpen && (
        <div className="md:hidden border-t border-navy-700 bg-navy-900 px-4 pb-4 pt-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-sans mb-1 transition-all duration-150
                ${location.pathname === to
                  ? 'bg-navy-700 text-gold-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-navy-800'
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2.5 w-full text-left text-sm font-sans text-slate-500 hover:text-red-400 mt-2"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
