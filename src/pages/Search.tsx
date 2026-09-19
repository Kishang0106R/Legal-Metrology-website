import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, FileText, Filter, History, Search as SearchIcon, ShieldCheck, Store, Tag, ClipboardCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '../components/common/DataTable'
import { PageHeader } from '../components/common/Ui'
import { useAuth } from '../context/AuthContext'
import { supabase as configuredSupabase } from '../services/supabase'

const supabase = configuredSupabase as any

type SearchResult = {
  id: string
  type: 'business' | 'product' | 'inspection' | 'violation' | 'report' | 'sample'
  title: string
  subtitle: string
  status?: string | null
  link: string
  updated_at?: string
}

const typeLabels: Record<SearchResult['type'], string> = {
  business: 'Business',
  product: 'Product',
  inspection: 'Inspection',
  violation: 'Violation',
  report: 'Report',
  sample: 'Sample',
}

export function SearchPage() {
  const auth = useAuth()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState(params.get('type') ?? 'all')
  const [query, setQuery] = useState(params.get('q') ?? '')

  useEffect(() => {
    setQuery(params.get('q') ?? '')
    setTypeFilter(params.get('type') ?? 'all')
  }, [params])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    const term = query.trim()
    const scopeBusinessId = auth.profile?.user_type === 'business' ? auth.profile.business_id : null
    const root = async () => {
      setLoading(true)
      const rows: SearchResult[] = []

      if (!term && typeFilter !== 'all') {
        setItems([])
        setLoading(false)
        return
      }

      if (term || typeFilter === 'all') {
        const businessQuery = supabase
          .from('businesses')
          .select('id, legal_name, business_code, status, updated_at')
          .order('updated_at', { ascending: false })
          .limit(25)

        if (scopeBusinessId) businessQuery.eq('id', scopeBusinessId)
        if (term) businessQuery.or(`legal_name.ilike.%${term}%,business_code.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
        const { data: businesses } = await businessQuery
        rows.push(...(businesses ?? []).map((item: any) => ({
          id: item.id,
          type: 'business',
          title: item.legal_name,
          subtitle: `${item.business_code} · ${item.status ?? 'Unknown status'}`,
          status: item.status,
          link: `/businesses/${item.id}`,
          updated_at: item.updated_at,
        })))
      }

      if (!term && typeFilter !== 'all' && typeFilter !== 'business') {
        // continue; the follow-up blocks will handle each table individually
      }

      if (!term || typeFilter === 'all' || typeFilter === 'product') {
        const productQuery = supabase
          .from('products')
          .select('id, product_name, product_code, brand_name, status, updated_at, business_id')
          .order('updated_at', { ascending: false })
          .limit(25)

        if (scopeBusinessId) productQuery.eq('business_id', scopeBusinessId)
        if (term) productQuery.or(`product_name.ilike.%${term}%,product_code.ilike.%${term}%,brand_name.ilike.%${term}%`)
        const { data: products } = await productQuery
        rows.push(...(products ?? []).map((item: any) => ({
          id: item.id,
          type: 'product',
          title: item.product_name,
          subtitle: `${item.product_code} · ${item.brand_name ?? 'Brand not supplied'}`,
          status: item.status,
          link: `/products/${item.id}`,
          updated_at: item.updated_at,
        })))
      }

      if (!term || typeFilter === 'all' || typeFilter === 'inspection') {
        const inspectionQuery = supabase
          .from('inspections')
          .select('id, inspection_number, status, priority, inspection_date, business_id, product_id, businesses(legal_name), products(product_name)')
          .order('inspection_date', { ascending: false })
          .limit(25)

        if (scopeBusinessId) inspectionQuery.eq('business_id', scopeBusinessId)
        if (term) inspectionQuery.or(`inspection_number.ilike.%${term}%,remarks.ilike.%${term}%,purpose.ilike.%${term}%`)
        const { data: inspections } = await inspectionQuery
        rows.push(...(inspections ?? []).map((item: any) => ({
          id: item.id,
          type: 'inspection',
          title: item.inspection_number,
          subtitle: `${item.businesses?.legal_name ?? 'Business'} · ${item.products?.product_name ?? 'Product'}`,
          status: item.status,
          link: `/inspections/${item.id}`,
          updated_at: item.inspection_date,
        })))
      }

      if (!term || typeFilter === 'all' || typeFilter === 'sample') {
        const sampleQuery = supabase
          .from('samples')
          .select('id, sample_number, sample_description, status, updated_at, business_id')
          .order('updated_at', { ascending: false })
          .limit(25)

        if (scopeBusinessId) sampleQuery.eq('business_id', scopeBusinessId)
        if (term) sampleQuery.or(`sample_number.ilike.%${term}%,sample_description.ilike.%${term}%`)
        const { data: samples } = await sampleQuery
        rows.push(...(samples ?? []).map((item: any) => ({
          id: item.id,
          type: 'sample',
          title: item.sample_number,
          subtitle: item.sample_description ?? 'Sample record',
          status: item.status,
          link: `/samples/${item.id}`,
          updated_at: item.updated_at,
        })))
      }

      if (!term || typeFilter === 'all' || typeFilter === 'violation') {
        const violationQuery = supabase
          .from('violations')
          .select('id, violation_number, violation_title, status, updated_at, business_id')
          .order('updated_at', { ascending: false })
          .limit(25)

        if (scopeBusinessId) violationQuery.eq('business_id', scopeBusinessId)
        if (term) violationQuery.or(`violation_number.ilike.%${term}%,violation_title.ilike.%${term}%,description.ilike.%${term}%`)
        const { data: violations } = await violationQuery
        rows.push(...(violations ?? []).map((item: any) => ({
          id: item.id,
          type: 'violation',
          title: item.violation_number,
          subtitle: item.violation_title,
          status: item.status,
          link: `/violations/${item.id}`,
          updated_at: item.updated_at,
        })))
      }

      if (!term || typeFilter === 'all' || typeFilter === 'report') {
        const reportQuery = supabase
          .from('reports')
          .select('id, report_number, title, status, updated_at, inspection_id')
          .order('updated_at', { ascending: false })
          .limit(25)

        if (scopeBusinessId) {
          const permitted = await supabase.from('inspections').select('id').eq('business_id', scopeBusinessId)
          const inspectionIds = (permitted.data ?? []).map((item: any) => item.id)
          if (inspectionIds.length === 0) reportQuery.eq('inspection_id', '00000000-0000-0000-0000-000000000000')
          else reportQuery.in('inspection_id', inspectionIds)
        }
        if (term) reportQuery.or(`report_number.ilike.%${term}%,title.ilike.%${term}%,description.ilike.%${term}%`)
        const { data: reports } = await reportQuery
        rows.push(...(reports ?? []).map((item: any) => ({
          id: item.id,
          type: 'report',
          title: item.report_number,
          subtitle: item.title,
          status: item.status,
          link: `/reports/${item.id}`,
          updated_at: item.updated_at,
        })))
      }

      const deduped = Array.from(new Map(rows.map((item) => [`${item.type}:${item.id}`, item])).values())
      deduped.sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
      setItems(deduped.filter((item) => typeFilter === 'all' || item.type === typeFilter))
      setLoading(false)
    }

    void root()
  }, [auth.profile?.business_id, auth.profile?.user_type, query, typeFilter])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return items
    return items.filter((item) => item.type === typeFilter)
  }, [items, typeFilter])

  const handleSearch = (nextQuery: string, nextType: string) => {
    const paramsObject = new URLSearchParams()
    if (nextQuery.trim()) paramsObject.set('q', nextQuery.trim())
    if (nextType && nextType !== 'all') paramsObject.set('type', nextType)
    setParams(paramsObject)
    setQuery(nextQuery)
    setTypeFilter(nextType)
  }

  const hasFilters = Boolean(query || typeFilter !== 'all')

  return <>
    <PageHeader
      eyebrow="Search & history"
      title="Centralized search"
      description="Search across the real records available to your account. Results are filtered by role and scope, and only use database-backed records."
      action={<Link className="button button-primary" to="/search/audit"><History size={16} /> Audit log</Link>}
    />

    <div className="toolbar" style={{ marginTop: 0 }}>
      <label className="search-box" style={{ flex: '1 1 320px' }}>
        <SearchIcon size={16} />
        <input value={query} onChange={(event) => handleSearch(event.target.value, typeFilter)} placeholder="Search businesses, products, inspections, violations, reports, samples..." aria-label="Search records" />
      </label>
      <select value={typeFilter} onChange={(event) => handleSearch(query, event.target.value)} aria-label="Filter by record type" style={{ minWidth: 160 }}>
        <option value="all">All record types</option>
        <option value="business">Businesses</option>
        <option value="product">Products</option>
        <option value="inspection">Inspections</option>
        <option value="violation">Violations</option>
        <option value="report">Reports</option>
        <option value="sample">Samples</option>
      </select>
      <button className="button button-ghost" onClick={() => handleSearch('', 'all')}><Filter size={16} /> Clear filters</button>
    </div>

    <div className="dashboard-table">
      {loading ? <div className="loading-state"><div className="spin" /> Loading search results...</div> : filtered.length === 0 ? <div className="module-panel"><div className="empty-state"><div className="empty-icon"><SearchIcon size={24} /></div><h3>{hasFilters ? 'No matching records found' : 'Search across your records'}</h3><p>{hasFilters ? 'Try a broader keyword or a different record type to widen the results.' : 'Use the keyword and filters above to find businesses, products, inspections, violations, reports, and samples.'}</p></div></div> : <DataTable headers={['Record type', 'Title', 'Context', 'Status', 'Updated', 'Open']}>
        {filtered.map((item) => <tr key={`${item.type}:${item.id}`}>
          <td><strong>{typeLabels[item.type]}</strong></td>
          <td>{item.title}</td>
          <td>{item.subtitle}</td>
          <td>{item.status ? <span className="status-badge status-neutral"><span className="status-dot" />{item.status}</span> : '—'}</td>
          <td>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '—'}</td>
          <td><Link className="text-link" to={item.link}>Open <ArrowRight size={14} /></Link></td>
        </tr>)}
      </DataTable>}
    </div>
  </>
}
