import type { ReactNode } from 'react'
import { LoaderCircle, Search, SlidersHorizontal } from 'lucide-react'
import type { Status } from '../../types'

export function StatusBadge({ status }: { status: Status }) {
  const tone = ['Compliant', 'Completed', 'Active', 'Approved'].includes(status) ? 'positive' : ['Pending', 'Under Review', 'Requires Verification'].includes(status) ? 'warning' : ['Non-Compliant', 'Violation', 'Rejected'].includes(status) ? 'negative' : 'neutral'
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{status}</span>
}

export function SearchBar({ placeholder = 'Search records...' }: { placeholder?: string }) {
  return <label className="search-box"><Search size={16} /><input placeholder={placeholder} aria-label={placeholder} /></label>
}

export function FilterBar() {
  return <button className="button button-ghost"><SlidersHorizontal size={16} /> Filters</button>
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: string }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={24} /></div><h3>{title}</h3><p>{description}</p>{action && <button className="button button-primary">{action}</button>}</div>
}

export function LoadingState() {
  return <div className="loading-state"><LoaderCircle className="spin" size={24} /> Loading records...</div>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action}</div>
}
