<<<<<<< HEAD
// Violations are created only from officer-confirmed non-compliance findings.
// @ts-nocheck

import { FormEvent, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Gavel,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { DataTable } from '../components/common/DataTable'
import {
  EmptyState,
  FilterBar,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../components/common/Ui'

import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../constants/permissions'
import { recordAudit } from '../services/audit'
import { supabase as configuredSupabase } from '../services/supabase'

const supabase = configuredSupabase as any

const types = [
  'Missing Mandatory Declaration',
  'Incorrect Declaration',
  'Incorrect Net Quantity',
  'Incorrect MRP',
  'Incorrect Date Declaration',
  'Missing Consumer Information',
  'Incorrect Manufacturer/Packer/Importer Information',
  'Packaging/Label Issue',
  'Other',
]

const severities = ['Low', 'Normal', 'High', 'Critical']

const statuses = [
  'Draft',
  'Pending Review',
  'Confirmed',
  'Notice/Action Pending',
  'Under Action',
  'Resolved',
  'Closed',
  'Withdrawn',
  'Requires More Evidence',
]

function violationStatus(value: string) {
  return (
    <StatusBadge
      status={
        ['Confirmed', 'Resolved', 'Closed'].includes(value)
          ? 'Completed'
          : ['Withdrawn'].includes(value)
            ? 'Inactive'
            : 'Pending'
      }
    />
  )
}

function severity(value: string) {
  return (
    <span className={`severity-badge severity-${value.toLowerCase()}`}>
      {value}
    </span>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="form-field">
      <span>
        {label}
        {required && ' *'}
      </span>

      <input
        type={type}
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[][]
}) {
  return (
    <label className="form-field">
      <span>{label}</span>

      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ViolationsPage() {
  const auth = useAuth()

  const [violations, setViolations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let request = supabase
      .from('violations')
      .select(
        '*, inspections(inspection_number), businesses(legal_name), products(product_name), compliance_rules(rule_code)',
      )
      .order('created_at', { ascending: false })
      .range(0, 99)

    if (
      auth.profile?.user_type === 'business' &&
      auth.profile.business_id
    ) {
      request = request.eq('business_id', auth.profile.business_id)
    }

    void request.then(({ data }) => {
      setViolations(data ?? [])
      setLoading(false)
    })
  }, [auth.profile?.business_id, auth.profile?.user_type])

  const rows = violations.filter(
    (item) =>
      (!query ||
        [
          item.violation_number,
          item.inspections?.inspection_number,
          item.businesses?.legal_name,
          item.products?.product_name,
          item.violation_title,
          item.compliance_rules?.rule_code,
        ].some((value) =>
          (value ?? '').toLowerCase().includes(query.toLowerCase()),
        )) &&
      (!status || item.status === status) &&
      (!severityFilter || item.severity === severityFilter),
  )

  const counts = {
    total: violations.length,

    pending: violations.filter((item) =>
      ['Draft', 'Pending Review', 'Requires More Evidence'].includes(
        item.status,
      ),
    ).length,

    confirmed: violations.filter(
      (item) => item.status === 'Confirmed',
    ).length,

    action: violations.filter(
      (item) => item.status === 'Under Action',
    ).length,

    resolved: violations.filter(
      (item) => item.status === 'Resolved',
    ).length,

    closed: violations.filter(
      (item) => item.status === 'Closed',
    ).length,
  }

  return (
    <>
      <PageHeader
        eyebrow="Officer-reviewed findings"
        title="Violations"
        description="Manage confirmed non-compliance records after evidence and officer review."
      />

      <div className="violation-disclaimer">
        <AlertTriangle size={17} />

        <span>
          Violations can only be created from officer-confirmed
          non-compliance. Automated OCR, compliance, or laboratory
          failures do not create violations by themselves.
        </span>
      </div>

      <div className="stat-grid violation-stat-grid">
        <Metric label="Total violations" value={counts.total} />
        <Metric label="Pending review" value={counts.pending} />
        <Metric label="Confirmed" value={counts.confirmed} />
        <Metric label="Under action" value={counts.action} />
        <Metric label="Resolved" value={counts.resolved} />
        <Metric label="Closed" value={counts.closed} />
      </div>

      <div className="business-toolbar">
        <label className="search-box">
          <Search size={16} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search violation, inspection, business, product, rule..."
          />
        </label>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>

          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
        >
          <option value="">All severity</option>

          {severities.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <FilterBar />
      </div>

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <div className="module-panel">
          <EmptyState
            icon={AlertTriangle}
            title="No violations found"
            description="Officer-confirmed findings eligible for violation records will appear here."
          />
        </div>
      ) : (
        <div className="dashboard-table">
          <DataTable
            headers={[
              'Violation number',
              'Inspection',
              'Business',
              'Product',
              'Type',
              'Rule',
              'Severity',
              'Status',
              'Confirmed date',
              'Actions',
            ]}
          >
            {rows.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    className="table-link"
                    to={`/violations/${item.id}`}
                  >
                    {item.violation_number}
                  </Link>
                </td>

                <td>
                  {item.inspections?.inspection_number}
                </td>

                <td>
                  {item.businesses?.legal_name}
                </td>

                <td>
                  {item.products?.product_name || '—'}
                </td>

                <td>{item.violation_type}</td>

                <td>
                  {item.compliance_rules?.rule_code || '—'}
                </td>

                <td>
                  {severity(item.severity)}
                </td>

                <td>
                  {violationStatus(item.status)}
                </td>

                <td>
                  {item.confirmed_date || '—'}
                </td>

                <td>
                  <Link
                    className="button button-ghost button-small"
                    to={`/violations/${item.id}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <article className="stat-card">
      <div className="stat-icon stat-red">
        <AlertTriangle size={18} />
      </div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>Database-driven</small>
      </div>
    </article>
  )
}

export function CreateViolationPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const checkId = params.get('checkId')

  const [check, setCheck] = useState<any>(null)

  const [form, setForm] = useState({
    violation_type: '',
    violation_title: '',
    description: '',
    severity: 'Normal',
    remarks: '',
  })

  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase || !checkId) return

    void supabase
      .from('compliance_checks')
      .select(
        '*, inspections(id, inspection_number, status, business_id, product_id, businesses(legal_name), products(product_name)), compliance_rules(rule_code, version, requirement, legal_reference)',
      )
      .eq('id', checkId)
      .single()
      .then(({ data }) => setCheck(data))
  }, [checkId])

  const update = (key: string) => (value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (!supabase || !auth.profile || !check) return

    if (check.officer_result !== 'Confirmed Non-Compliant') {
      setMessage(
        'A violation requires an officer-confirmed non-compliance finding.',
      )
      return
    }

    if (!form.violation_type || !form.violation_title) {
      setMessage('Violation type and title are required.')
      return
    }

    setSaving(true)

    const code = await supabase.rpc('next_violation_number')

    const result = await supabase
      .from('violations')
      .insert({
        violation_number: code.data,
        inspection_id: check.inspection_id,
        business_id: check.inspections.business_id,
        product_id: check.inspections.product_id,
        compliance_check_id: check.id,
        rule_id: check.rule_id,
        violation_type: form.violation_type,
        violation_title: form.violation_title,
        description: form.description,
        observed_value: check.observed_value,
        legal_requirement: check.expected_requirement,
        legal_reference:
          check.compliance_rules?.legal_reference,
        severity: form.severity,
        status: 'Pending Review',
        remarks: form.remarks,
        created_by: auth.profile.id,
      })
      .select()
      .single()

    setSaving(false)

    if (result.error || code.error) {
      setMessage(
        result.error?.message?.includes('officer')
          ? 'Only officer-confirmed non-compliance can create a violation.'
          : 'The violation could not be created.',
      )

      return
    }

    void recordAudit(
      'violation_created',
      'violation',
      result.data.id,
      undefined,
      result.data,
    )

    navigate(`/violations/${result.data.id}`)
  }

  if (!checkId) {
    return (
      <div className="module-panel">
        <EmptyState
          icon={AlertTriangle}
          title="No compliance finding selected"
          description="Create a violation from an officer-confirmed compliance finding."
        />
      </div>
    )
  }

  if (!check) {
    return <LoadingState />
  }

  return (
    <>
      <PageHeader
        eyebrow="Controlled violation creation"
        title="Create violation"
        description="This record is created only from an officer-confirmed non-compliance finding."
      />

      <div className="violation-source">
        <div>
          <small>Inspection</small>
          <strong>
            {check.inspections?.inspection_number}
          </strong>
        </div>

        <div>
          <small>Business</small>
          <strong>
            {check.inspections?.businesses?.legal_name}
          </strong>
        </div>

        <div>
          <small>Rule</small>
          <strong>
            {check.compliance_rules?.rule_code} v
            {check.compliance_rules?.version}
          </strong>
        </div>

        <div>
          <small>Officer decision</small>
          <strong>{check.officer_result}</strong>
        </div>
      </div>

      <form
        className="record-form"
        onSubmit={submit}
      >
        <div className="form-section">
          <p className="eyebrow">
            Officer-provided classification
          </p>

          <h2>Violation details</h2>

          <div className="form-two-col">
            <Select
              label="Violation type"
              value={form.violation_type}
              onChange={update('violation_type')}
              options={types.map((item) => [item, item])}
            />

            <Field
              label="Violation title"
              value={form.violation_title}
              onChange={update('violation_title')}
              required
            />

            <Select
              label="Severity"
              value={form.severity}
              onChange={update('severity')}
              options={severities.map((item) => [
                item,
                item,
              ])}
            />
          </div>

          <label className="form-field">
            <span>Description</span>

            <textarea
              value={form.description}
              onChange={(event) =>
                update('description')(
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
            <span>Remarks</span>

            <textarea
              value={form.remarks}
              onChange={(event) =>
                update('remarks')(event.target.value)
              }
            />
          </label>
        </div>

        <div className="form-section">
          <p className="eyebrow">
            Evidence carried forward
          </p>

          <h2>Automated finding</h2>

          <div className="detail-fields">
            <Detail
              label="Automated result"
              value={check.automated_result}
            />

            <Detail
              label="Observed value"
              value={
                check.observed_value || 'Not detected'
              }
            />

            <Detail
              label="Requirement"
              value={check.expected_requirement}
            />

            <Detail
              label="Reason"
              value={check.automated_reason}
            />
          </div>
        </div>

        {message && (
          <div className="inline-error">
            {message}
          </div>
        )}

        <div className="form-actions">
          <Link
            className="button button-ghost"
            to="/violations"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="button button-primary"
            disabled={saving}
          >
            {saving
              ? 'Creating...'
              : 'Create violation'}
          </button>
        </div>
      </form>
    </>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="detail-field">
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

export function ViolationDetailsPage() {
  const { violationId } = useParams()
  const auth = useAuth()

  const [violation, setViolation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (!supabase || !violationId) {
      setLoading(false)
      return
    }

    void supabase
      .from('violations')
      .select(
        '*, inspections(inspection_number, inspection_date, inspection_type, inspection_location, offices(office_name), profiles(full_name)), businesses(legal_name, business_code, business_type, registration_number, address, contact_person, phone, email), products(product_name, product_code, brand_name, product_category, declared_quantity, mrp), compliance_rules(rule_code, version, requirement, legal_reference), compliance_checks(automated_result, automated_reason, officer_result, officer_remarks, reviewed_at)',
      )
      .eq('id', violationId)
      .single()
      .then(({ data }) => {
        setViolation(data)
        setLoading(false)
      })
  }, [violationId])

  const updateStatus = async () => {
    if (
      !supabase ||
      !auth.profile ||
      !newStatus ||
      !violation
    ) {
      return
    }

    if (newStatus === 'Closed' && !remarks.trim()) {
      return
    }

    const payload: any = {
      status: newStatus,
      remarks,
    }

    if (newStatus === 'Confirmed') {
      payload.confirmed_by = auth.profile.id
      payload.confirmed_date = new Date()
        .toISOString()
        .slice(0, 10)
    }

    if (newStatus === 'Closed') {
      payload.closed_by = auth.profile.id
      payload.closed_at = new Date().toISOString()
      payload.closure_remarks = remarks
    }

    const result = await supabase
      .from('violations')
      .update(payload)
      .eq('id', violation.id)
      .select()
      .single()

    if (!result.error) {
      void recordAudit(
        `violation_${newStatus
          .toLowerCase()
          .replaceAll(' ', '_')}`,
        'violation',
        violation.id,
        violation,
        result.data,
      )

      setViolation(result.data)
      setNewStatus('')
      setRemarks('')
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!violation) {
    return (
      <div className="module-panel">
        <EmptyState
          icon={AlertTriangle}
          title="Violation not found"
          description="This violation is unavailable in your permitted scope."
        />
      </div>
    )
  }

  return (
    <>
      <div className="detail-back">
        <Link to="/violations">
          <ArrowLeft size={14} />
          All violations
        </Link>
      </div>

      <PageHeader
        eyebrow="Officer-reviewed violation"
        title={violation.violation_number}
        description={`${violation.businesses?.legal_name ?? 'Business'} · ${
          violation.products?.product_name ?? 'Product'
        }`}
        action={
          hasPermission(
            auth.profile?.role,
            'reports.generate',
          ) && (
            <Link
              className="button button-primary"
              to={`/reports/new?inspectionId=${violation.inspection_id}&reportType=violation`}
            >
              <FileText size={16} />
              Generate Report
            </Link>
          )
        }
      />

      <div className="violation-identity">
        <div>
          <small>Status</small>
          {violationStatus(violation.status)}
        </div>

        <div>
          <small>Severity</small>
          {severity(violation.severity)}
        </div>

        <div>
          <small>Inspection</small>

          <Link
            to={`/inspections/${violation.inspection_id}`}
          >
            {violation.inspections?.inspection_number}
          </Link>
        </div>

        <div>
          <small>Rule</small>

          <strong>
            {violation.compliance_rules?.rule_code} v
            {violation.compliance_rules?.version}
          </strong>
        </div>
      </div>

      <div className="violation-flow">
        <span>Evidence</span>
        <b>→</b>

        <span>Automated Finding</span>
        <b>→</b>

        <span>Officer Decision</span>
        <b>→</b>

        <strong>Violation</strong>
        <b>→</b>

        <span>Action / Closure</span>
      </div>

      <div className="detail-grid">
        <section className="detail-card">
          <div className="detail-card-heading">
            <AlertTriangle size={20} />

            <div>
              <h2>Violation overview</h2>
              <p>
                Administrative classification and status
              </p>
            </div>

            {violationStatus(violation.status)}
          </div>

          <div className="detail-fields">
            <Detail
              label="Type"
              value={violation.violation_type}
            />

            <Detail
              label="Title"
              value={violation.violation_title}
            />

            <Detail
              label="Description"
              value={
                violation.description ||
                'Not provided'
              }
            />

            <Detail
              label="Observed value"
              value={
                violation.observed_value ||
                'Not provided'
              }
            />

            <Detail
              label="Detected date"
              value={
                violation.detected_date ||
                'Not provided'
              }
            />

            <Detail
              label="Confirmed date"
              value={
                violation.confirmed_date ||
                'Not confirmed'
              }
            />

            <Detail
              label="Remarks"
              value={
                violation.remarks ||
                'Not provided'
              }
            />
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-heading">
            <Gavel size={20} />

            <div>
              <h2>Legal basis</h2>
              <p>
                Versioned reference carried from the
                compliance finding
              </p>
            </div>
          </div>

          <div className="detail-fields">
            <Detail
              label="Rule code"
              value={
                violation.compliance_rules
                  ?.rule_code ||
                'Not available'
              }
            />

            <Detail
              label="Rule version"
              value={
                violation.compliance_rules
                  ?.version ||
                'Not available'
              }
            />

            <Detail
              label="Requirement"
              value={
                violation.legal_requirement ||
                violation.compliance_rules
                  ?.requirement ||
                'Not provided'
              }
            />

            <Detail
              label="Legal reference"
              value={
                violation.legal_reference ||
                'Not configured'
              }
            />
          </div>
        </section>
      </div>

      <section className="detail-card violation-review-card">
        <div className="detail-card-heading">
          <ShieldCheck size={20} />

          <div>
            <h2>Compliance finding</h2>
            <p>
              Automated result and officer decision
              remain separate
            </p>
          </div>
        </div>

        <div className="detail-fields">
          <Detail
            label="Automated result"
            value={
              violation.compliance_checks
                ?.automated_result ||
              'Not available'
            }
          />

          <Detail
            label="Automated reason"
            value={
              violation.compliance_checks
                ?.automated_reason ||
              'Not available'
            }
          />

          <Detail
            label="Officer result"
            value={
              violation.compliance_checks
                ?.officer_result ||
              'Not available'
            }
          />

          <Detail
            label="Officer remarks"
            value={
              violation.compliance_checks
                ?.officer_remarks ||
              'Not provided'
            }
          />
        </div>
      </section>

      {hasPermission(
        auth.profile?.role,
        'violations.review',
      ) && (
        <section className="record-form status-update-form">
          <div className="form-section">
            <p className="eyebrow">
              Controlled workflow
            </p>

            <h2>Update violation status</h2>

            <div className="form-two-col">
              <Select
                label="Next status"
                value={newStatus}
                onChange={setNewStatus}
                options={[
                  'Pending Review',
                  'Confirmed',
                  'Requires More Evidence',
                  'Withdrawn',
                  'Under Action',
                  'Resolved',
                  'Closed',
                ].map((item) => [item, item])}
              />

              <Field
                label="Remarks"
                value={remarks}
                onChange={setRemarks}
                required={newStatus === 'Closed'}
              />
            </div>

            <button
              className="button button-primary"
              disabled={!newStatus}
              onClick={() => void updateStatus()}
            >
              Save status
            </button>
          </div>
        </section>
      )}

      {/* FIX: Reports section is inside the main fragment */}
      <ViolationReportsSection
        violationId={violation.id}
      />
    </>
  )
}

function ViolationReportsSection({
  violationId,
}: {
  violationId: string
}) {
  const [reports, setReports] = useState<any[]>([])

  useEffect(() => {
    if (!supabase || !violationId) return

    void supabase
      .from('reports')
      .select('*')
      .eq('violation_id', violationId)
      .order('created_at', {
        ascending: false,
      })
      .then(({ data }) => {
        setReports(data ?? [])
      })
  }, [violationId])

  return (
    <section className="dashboard-table detail-section">
      <div className="table-heading">
        <div>
          <p className="eyebrow">
            Document management
          </p>

          <h2>Violation reports</h2>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports generated"
          description="Reports specifically generated for this violation will appear here."
        />
      ) : (
        <DataTable
          headers={[
            'Report Number',
            'Type',
            'Version',
            'Status',
            'Generated Date',
            'Actions',
          ]}
        >
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.report_number}</td>

              <td>{report.report_type}</td>

              <td>{report.version}</td>

              <td>
                <StatusBadge
                  status={report.status}
                />
              </td>

              <td>
                {report.generated_at
                  ? new Date(
                      report.generated_at,
                    ).toLocaleDateString()
                  : '—'}
              </td>

              <td>
                <Link
                  className="button button-ghost button-small"
                  to={`/reports/${report.id}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </section>
  )
}
=======
﻿// Violations are created only from officer-confirmed non-compliance findings.
// @ts-nocheck
import { FormEvent, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Search } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '../components/common/DataTable'
import { EmptyState, FilterBar, LoadingState, PageHeader, StatusBadge } from '../components/common/Ui'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../constants/permissions'
import { recordAudit } from '../services/audit'
import { supabase as configuredSupabase } from '../services/supabase'

const supabase = configuredSupabase as any
const violationTypes = ['Missing Mandatory Declaration', 'Incorrect Declaration', 'Incorrect Net Quantity', 'Incorrect MRP', 'Incorrect Date Declaration', 'Missing Consumer Information', 'Incorrect Manufacturer/Packer/Importer Information', 'Packaging/Label Issue', 'Other']
const severities = ['Low', 'Normal', 'High', 'Critical']
const statuses = ['Draft', 'Pending Review', 'Confirmed', 'Notice/Action Pending', 'Under Action', 'Resolved', 'Closed', 'Withdrawn', 'Requires More Evidence']

function violationStatus(value: string) {
  return <StatusBadge status={['Confirmed', 'Resolved', 'Closed'].includes(value) ? 'Completed' : ['Withdrawn'].includes(value) ? 'Inactive' : 'Pending'} />
}

function severity(value: string) {
  return <span className={`severity-badge severity-${value.toLowerCase()}`}>{value}</span>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="form-field"><span>{label}{required && ' *'}</span><input type={type} value={value ?? ''} required={required} onChange={(event) => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="form-field"><span>{label}</span><select value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
}

export function ViolationsPage() {
  const auth = useAuth()
  const [violations, setViolations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let request = supabase
      .from('violations')
      .select('*, inspections(inspection_number), businesses(legal_name), products(product_name), compliance_rules(rule_code)')
      .order('created_at', { ascending: false })
      .range(0, 99)

    if (auth.profile?.user_type === 'business' && auth.profile.business_id) {
      request = request.eq('business_id', auth.profile.business_id)
    }

    void request.then(({ data }) => {
      setViolations(data ?? [])
      setLoading(false)
    })
  }, [auth.profile?.business_id, auth.profile?.user_type])

  const rows = violations.filter((item) =>
    (!query || [item.violation_number, item.inspections?.inspection_number, item.businesses?.legal_name, item.products?.product_name, item.violation_title, item.compliance_rules?.rule_code].some((value) => (value ?? '').toLowerCase().includes(query.toLowerCase()))) &&
    (!status || item.status === status) &&
    (!severityFilter || item.severity === severityFilter)
  )

  const counts = {
    total: violations.length,
    pending: violations.filter((item) => ['Draft', 'Pending Review', 'Requires More Evidence'].includes(item.status)).length,
    confirmed: violations.filter((item) => item.status === 'Confirmed').length,
    action: violations.filter((item) => item.status === 'Under Action').length,
    resolved: violations.filter((item) => item.status === 'Resolved').length,
    closed: violations.filter((item) => item.status === 'Closed').length,
  }

  return <>
    <PageHeader eyebrow="Officer-reviewed findings" title="Violations" description="Manage confirmed non-compliance records after evidence and officer review." />
    <div className="violation-disclaimer"><AlertTriangle size={17} /><span>Violations can only be created from officer-confirmed non-compliance findings and are subject to review before action.</span></div>
    <div className="stat-grid violation-stat-grid">
      <Metric label="Total violations" value={counts.total} />
      <Metric label="Pending" value={counts.pending} />
      <Metric label="Confirmed" value={counts.confirmed} />
      <Metric label="Under action" value={counts.action} />
      <Metric label="Resolved" value={counts.resolved} />
      <Metric label="Closed" value={counts.closed} />
    </div>
    <div className="business-toolbar">
      <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search violation, inspection, business, product..." /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option value="">All severities</option>{severities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <FilterBar />
    </div>
    {loading ? <LoadingState /> : rows.length === 0 ? <div className="module-panel"><EmptyState icon={AlertTriangle} title="No violations found" description="Confirmed non-compliance records will appear here." /></div> : <div className="dashboard-table"><DataTable headers={['Violation', 'Inspection', 'Business', 'Product', 'Severity', 'Status', 'Actions']}>{rows.map((item) => <tr key={item.id}><td><Link className="table-link" to={`/violations/${item.id}`}>{item.violation_number}</Link></td><td>{item.inspections?.inspection_number ?? '—'}</td><td>{item.businesses?.legal_name ?? '—'}</td><td>{item.products?.product_name ?? '—'}</td><td>{severity(item.severity)}</td><td>{violationStatus(item.status)}</td><td><Link className="button button-ghost button-small" to={`/violations/${item.id}`}>View</Link></td></tr>)}</DataTable></div>}
  </>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="stat-card"><div className="stat-icon stat-red"><AlertTriangle size={18} /></div><div><p>{label}</p><strong>{value}</strong><small>Database-driven</small></div></article>
}

export function CreateViolationPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const checkId = params.get('checkId')
  const [check, setCheck] = useState<any>(null)
  const [form, setForm] = useState({ violation_type: '', violation_title: '', description: '', severity: 'Normal', remarks: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase || !checkId) return
    void supabase
      .from('compliance_checks')
      .select('*, inspections(id, inspection_number, status, business_id, product_id, businesses(legal_name), products(product_name)), compliance_rules(rule_code, version, requirement, legal_reference)')
      .eq('id', checkId)
      .single()
      .then(({ data }) => setCheck(data))
  }, [checkId])

  const update = (key: string) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !auth.profile || !check) {
      setMessage('Select a valid compliance check first.')
      return
    }

    if (check.officer_result !== 'Confirmed Non-Compliant') {
      setMessage('A violation requires an officer-confirmed non-compliance finding.')
      return
    }

    if (!form.violation_type || !form.violation_title) {
      setMessage('Violation type and title are required.')
      return
    }

    setSaving(true)
    const code = await supabase.rpc('next_violation_number')
    const payload = {
      violation_number: code.data,
      inspection_id: check.inspection_id,
      business_id: check.inspections.business_id,
      product_id: check.inspections.product_id,
      compliance_check_id: check.id,
      rule_id: check.rule_id,
      violation_type: form.violation_type,
      violation_title: form.violation_title,
      description: form.description,
      observed_value: check.observed_value,
      legal_requirement: check.expected_requirement,
      legal_reference: check.compliance_rules?.legal_reference,
      severity: form.severity,
      status: 'Pending Review',
      remarks: form.remarks,
      created_by: auth.profile.id,
    }

    const result = await supabase.from('violations').insert(payload).select().single()
    setSaving(false)

    if (result.error || code.error) {
      setMessage('The violation could not be created.')
      return
    }

    void recordAudit('violation_created', 'violation', result.data.id, undefined, result.data)
    navigate(`/violations/${result.data.id}`)
  }

  if (!check) {
    return <LoadingState />
  }

  return <>
    <PageHeader eyebrow="Officer review" title="Create violation" description="Record a confirmed non-compliance finding against the relevant inspection and product." />
    <form className="form-panel" onSubmit={submit}>
      <div className="detail-grid form-grid">
        <div className="detail-card"><div className="detail-card-heading"><AlertTriangle size={18} /><div><h2>Violation details</h2><p>Only officer-confirmed findings may be recorded.</p></div></div><div className="detail-fields">
          <Select label="Violation type" value={form.violation_type} onChange={update('violation_type')} options={violationTypes.map((item) => [item, item])} />
          <Field label="Violation title" value={form.violation_title} onChange={update('violation_title')} required />
          <label className="form-field"><span>Severity</span><select value={form.severity} onChange={(event) => update('severity')(event.target.value)}>{severities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="form-field"><span>Description</span><textarea value={form.description} onChange={(event) => update('description')(event.target.value)} rows={4} /></label>
          <label className="form-field"><span>Officer remarks</span><textarea value={form.remarks} onChange={(event) => update('remarks')(event.target.value)} rows={4} /></label>
        </div></div>
        <div className="detail-card"><div className="detail-card-heading"><FileText size={18} /><div><h2>Related inspection</h2><p>Source record</p></div></div><div className="detail-fields">
          <div className="detail-field"><div><small>Inspection</small><strong>{check.inspections?.inspection_number ?? '—'}</strong></div></div>
          <div className="detail-field"><div><small>Business</small><strong>{check.inspections?.businesses?.legal_name ?? '—'}</strong></div></div>
          <div className="detail-field"><div><small>Product</small><strong>{check.inspections?.products?.product_name ?? '—'}</strong></div></div>
          <div className="detail-field"><div><small>Rule</small><strong>{check.compliance_rules?.rule_code ?? '—'}</strong></div></div>
          <div className="detail-field"><div><small>Officer result</small><strong>{check.officer_result ?? 'Not provided'}</strong></div></div>
          <div className="detail-field"><div><small>Observed value</small><strong>{check.observed_value ?? '—'}</strong></div></div>
        </div></div>
      </div>
      {message && <div className="inline-error">{message}</div>}
      <div className="form-actions"><Link className="button button-ghost" to="/violations">Cancel</Link><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create violation'}</button></div>
    </form>
  </>
}

export function ViolationDetailsPage() {
  const { violationId } = useParams()
  const auth = useAuth()
  const [violation, setViolation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (!supabase || !violationId) {
      setLoading(false)
      return
    }

    void supabase
      .from('violations')
      .select('*, inspections(inspection_number, inspection_date, inspection_type, inspection_location, offices(office_name), profiles(full_name)), businesses(legal_name, business_code, business_type, registration_number, address, contact_person, phone, email), products(product_name, product_code, brand_name, product_category, declared_quantity, mrp), compliance_rules(rule_code, version, requirement, legal_reference), compliance_checks(automated_result, automated_reason, officer_result, officer_remarks, reviewed_at)')
      .eq('id', violationId)
      .single()
      .then(({ data }) => {
        setViolation(data)
        setLoading(false)
      })
  }, [violationId])

  const updateStatus = async () => {
    if (!supabase || !auth.profile || !newStatus || !violation) return
    if (newStatus === 'Closed' && !remarks.trim()) return

    const payload: any = { status: newStatus, remarks }
    if (newStatus === 'Confirmed') {
      payload.confirmed_by = auth.profile.id
      payload.confirmed_date = new Date().toISOString().slice(0, 10)
    }
    if (newStatus === 'Closed') {
      payload.closed_by = auth.profile.id
      payload.closed_at = new Date().toISOString()
      payload.closure_remarks = remarks
    }

    const result = await supabase.from('violations').update(payload).eq('id', violation.id).select().single()
    if (!result.error) {
      void recordAudit(`violation_${newStatus.toLowerCase().replaceAll(' ', '_')}`, 'violation', violation.id, violation, result.data)
      setViolation(result.data)
      setNewStatus('')
      setRemarks('')
    }
  }

  if (loading) return <LoadingState />
  if (!violation) {
    return <div className="module-panel"><EmptyState icon={AlertTriangle} title="Violation not found" description="This record is unavailable in your permitted scope." /></div>
  }

  return <>
    <div className="detail-back"><Link to="/violations"><ArrowLeft size={14} /> All violations</Link></div>
    <PageHeader eyebrow="Officer-reviewed finding" title={violation.violation_number} description={`${violation.businesses?.legal_name ?? 'Business'} · ${violation.products?.product_name ?? 'Product'}`} />
    <div className="detail-grid">
      <section className="detail-card"><div className="detail-card-heading"><AlertTriangle size={20} /><div><h2>Violation overview</h2><p>Current status and key details</p></div>{violationStatus(violation.status)}</div><div className="detail-fields">
        <div className="detail-field"><div><small>Violation number</small><strong>{violation.violation_number}</strong></div></div>
        <div className="detail-field"><div><small>Inspection</small><strong>{violation.inspections?.inspection_number ?? '—'}</strong></div></div>
        <div className="detail-field"><div><small>Type</small><strong>{violation.violation_type ?? '—'}</strong></div></div>
        <div className="detail-field"><div><small>Severity</small><strong>{violation.severity ?? '—'}</strong></div></div>
        <div className="detail-field"><div><small>Status</small><strong>{violation.status}</strong></div></div>
        <div className="detail-field"><div><small>Description</small><strong>{violation.description || 'Not provided'}</strong></div></div>
      </div></section>
      <section className="detail-card"><div className="detail-card-heading"><CheckCircle2 size={20} /><div><h2>Officer workflow</h2><p>Review and status tracking</p></div></div><div className="detail-fields">
        <label className="form-field"><span>Update status</span><select value={newStatus} onChange={(event) => setNewStatus(event.target.value)}><option value="">Choose status</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="form-field"><span>Remarks</span><textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} /></label>
        <button className="button button-primary" type="button" onClick={updateStatus} disabled={!newStatus}>Save status</button>
      </div></section>
    </div>
    <div className="detail-separator" />
    <ViolationReportsSection violationId={violation.id} />
  </>
}

function ViolationReportsSection({ violationId }: { violationId: string }) {
  const [reports, setReports] = useState<any[]>([])
  useEffect(() => {
    if (!supabase || !violationId) return
    void supabase.from('reports').select('*').eq('violation_id', violationId).order('created_at', { ascending: false }).then(({ data }) => setReports(data ?? []))
  }, [violationId])

  return <section className="dashboard-table detail-section"><div className="table-heading"><div><p className="eyebrow">Document management</p><h2>Violation reports</h2></div></div>{reports.length === 0 ? <EmptyState icon={FileText} title="No reports generated" description="Reports specifically generated for this violation will appear here." /> : <DataTable headers={['Report Number', 'Type', 'Version', 'Status', 'Generated Date', 'Actions']}>{reports.map((report) => <tr key={report.id}><td>{report.report_number}</td><td>{report.report_type}</td><td>{report.version}</td><td><StatusBadge status={report.status} /></td><td>{report.generated_at ? new Date(report.generated_at).toLocaleDateString() : '—'}</td><td><Link className="button button-ghost button-small" to={`/reports/${report.id}`}>View</Link></td></tr>)}</DataTable>}</section>
}
>>>>>>> shadow-work
