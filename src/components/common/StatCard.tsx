import type { LucideIcon } from 'lucide-react'

export function StatCard({ label, value, change, icon: Icon, tone = 'blue' }: { label: string; value: string; change: string; icon: LucideIcon; tone?: 'blue' | 'amber' | 'red' | 'green' }) {
  return <article className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={20} /></div><div><p>{label}</p><strong>{value}</strong><small>{change}</small></div></article>
}
