import { useEffect, useState } from 'react'
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTable } from '../components/common/DataTable'
import { PageHeader } from '../components/common/Ui'
import { supabase as configuredSupabase } from '../services/supabase'

const supabase = configuredSupabase as any

type AuditRow = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
  user_id: string | null
  new_data: Record<string, unknown> | null
}

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    void supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then((result: { data: AuditRow[] | null; error: any | null }) => {
        const { data, error } = result
        if (!error) setRows((data ?? []) as AuditRow[])
        setLoading(false)
      })
  }, [])

  return <>
    <div className="detail-back"><Link to="/search"><ArrowLeft size={14} /> Search</Link></div>
    <PageHeader
      eyebrow="Audit history"
      title="Audit log"
      description="A centralized audit trail for administrative review and compliance oversight."
      action={<span className="button button-ghost"><ShieldCheck size={16} /> Admin only</span>}
    />

    <div className="dashboard-table">
      {loading ? <div className="loading-state"><div className="spin" /> Loading audit records...</div> : rows.length === 0 ? <div className="module-panel"><div className="empty-state"><div className="empty-icon"><FileText size={24} /></div><h3>No audit entries found</h3><p>No user or system activity has been recorded yet.</p></div></div> : <DataTable headers={['Timestamp', 'Action', 'Entity type', 'Entity id', 'User', 'Details']}>
        {rows.map((row) => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.action}</td><td>{row.entity_type}</td><td>{row.entity_id ?? '—'}</td><td>{row.user_id ?? 'System'}</td><td>{row.new_data ? JSON.stringify(row.new_data).slice(0, 140) : '—'}</td></tr>)}
      </DataTable>}
    </div>
  </>
}
