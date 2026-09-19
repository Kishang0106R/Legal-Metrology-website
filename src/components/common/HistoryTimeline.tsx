import { useEffect, useState } from 'react'
import { Clock3, History as HistoryIcon } from 'lucide-react'
import { supabase as configuredSupabase } from '../../services/supabase'

const supabase = configuredSupabase as any

type HistoryEntry = {
  id: string
  action: string
  created_at: string
  entity_type: string
  entity_id: string | null
  user_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

function summarizeRecord(value: Record<string, unknown> | null | undefined) {
  if (!value) return 'No value captured'
  const source = Object.entries(value).slice(0, 3).map(([key, entry]) => `${key}: ${typeof entry === 'object' ? JSON.stringify(entry) : String(entry)}`)
  return source.join(' · ') || 'Updated record'
}

export function HistoryTimeline({ entityType, entityId, title = 'Record history' }: { entityType: string; entityId: string; title?: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !entityType || !entityId) {
      setLoading(false)
      return
    }

    void supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .then((result: { data: HistoryEntry[] | null; error: any | null }) => {
        const { data, error } = result
        if (!error) setEntries((data ?? []) as HistoryEntry[])
        setLoading(false)
      })
  }, [entityId, entityType])

  return <section className="detail-card">
    <div className="detail-card-heading">
      <HistoryIcon size={20} />
      <div>
        <h2>{title}</h2>
        <p>Chronology of changes recorded for this record</p>
      </div>
    </div>

    {loading ? <div className="loading-state"><span className="spin" /> Loading history...</div> : entries.length === 0 ? <div className="module-panel"><div className="empty-state"><div className="empty-icon"><Clock3 size={24} /></div><h3>No history recorded</h3><p>No audit entries were found for this record yet.</p></div></div> : <div className="custody-timeline">{entries.map((entry) => <div key={entry.id}><i /><div><strong>{entry.action}</strong><span>{new Date(entry.created_at).toLocaleString()}</span><small>By: {entry.user_id ?? 'System'}{entry.old_data || entry.new_data ? ` · ${summarizeRecord(entry.new_data ?? entry.old_data ?? {})}` : ''}</small></div></div>)}</div>}
  </section>
}
