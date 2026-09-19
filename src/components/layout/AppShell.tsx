import { useState } from 'react'
import { Bell, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getNavigationForRole } from '../../constants/navigation'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { roleLabels } from '../../types/auth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navigation = getNavigationForRole(auth.profile?.role)
  const current = navigation.find((item) => location.pathname === item.path)
  const logout = async () => { await auth.signOut() }
  const submitSearch = () => {
    const term = searchValue.trim()
    if (!term) return
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }
  const isDemo = import.meta.env.DEV && Boolean(auth.profile?.is_demo)
  return <div className="app-shell">{isDemo && <div className="demo-environment-banner" role="status">DEMO / DEVELOPMENT ENVIRONMENT</div>}<aside className={cn('sidebar', collapsed && 'sidebar-collapsed', mobileOpen && 'sidebar-mobile-open')}>
    <div className="brand"><div className="brand-mark"><ShieldCheck size={19} /></div><div className="brand-copy"><strong>Legal Metrology</strong><span>Inspection portal</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={19} /></button></div>
    <nav className="sidebar-nav"><p className="nav-label">{auth.profile?.user_type === 'business' ? 'Business workspace' : 'Department workspace'}</p>{navigation.map((item) => <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}><item.icon size={18} /><span>{item.label}</span></NavLink>)}</nav>
    <div className="sidebar-footer"><div className="office-chip"><div className="avatar avatar-small">{auth.profile?.full_name.slice(0, 2).toUpperCase() ?? 'LM'}</div><div><strong>{auth.profile?.user_type === 'business' ? 'Business account' : 'Government account'}</strong><span>{auth.profile ? roleLabels[auth.profile.role] : 'Secure workspace'}</span></div></div><button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
  </aside><div className={cn('main-area', collapsed && 'main-area-expanded')}><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21} /></button><div className="breadcrumbs"><Link to="/dashboard">Workspace</Link><span>/</span><strong>{current?.label ?? 'Overview'}</strong></div><div className="topbar-actions"><label className="top-search"><Search size={16} /><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitSearch() } }} placeholder="Search" aria-label="Search workspace" /></label><Link className="icon-button" to="/notifications" aria-label="Notifications"><Bell size={19} /><i /></Link><details className="profile-menu"><summary className="profile-button"><span className="avatar">{auth.profile?.full_name.slice(0, 2).toUpperCase() ?? 'LM'}</span><span className="profile-copy"><strong>{auth.profile?.full_name ?? 'Account'}</strong><small>{auth.profile ? roleLabels[auth.profile.role] : ''}</small></span><ChevronDown size={16} /></summary><div className="profile-dropdown"><p>{auth.profile?.email}</p><Link to="/profile">My Profile</Link><Link to="/settings">Account Settings</Link><Link to="/notifications">Notifications</Link><button onClick={logout}>Logout</button></div></details></div></header><main className="content">{children}</main></div></div>
}
