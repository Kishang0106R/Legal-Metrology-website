import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel } from 'docx'
import { supabase } from './supabase'

export type ReportSnapshot = Record<string, any>

function lines(snapshot: ReportSnapshot) {
  const rows: string[] = []
  const add = (label: string, value: unknown) => rows.push(`${label}: ${value ?? 'Not provided'}`)
  add('Report number', snapshot.report_number); add('Version', snapshot.version); add('Report type', snapshot.report_type); add('Generated', snapshot.generated_at)
  if (snapshot.inspection) { add('Inspection', snapshot.inspection.inspection_number); add('Inspection date', snapshot.inspection.inspection_date); add('Inspection type', snapshot.inspection.inspection_type); add('Location', snapshot.inspection.inspection_location); add('Office', snapshot.inspection.offices?.office_name); add('Inspector', snapshot.inspection.profiles?.full_name) }
  if (snapshot.business) { add('Business', snapshot.business.legal_name); add('Business code', snapshot.business.business_code); add('Business type', snapshot.business.business_type); add('Address', snapshot.business.address ?? `${snapshot.business.district ?? ''}, ${snapshot.business.state ?? ''}`) }
  if (snapshot.product) { add('Product', snapshot.product.product_name); add('Product code', snapshot.product.product_code); add('Brand', snapshot.product.brand_name); add('Category', snapshot.product.product_category); add('MRP', snapshot.product.mrp) }
  if (snapshot.disclaimer) rows.push(snapshot.disclaimer)
  return rows
}

async function checksum(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, '0')).join('')
}

export async function loadReportSnapshot(reportId: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('report_data_snapshots').select('snapshot_json').eq('report_id', reportId).order('created_at', { ascending: false }).limit(1).single()
  if (error) throw error
  return data.snapshot_json as ReportSnapshot
}

export async function generatePDF(reportId: string, snapshot?: ReportSnapshot) {
  const data = snapshot ?? await loadReportSnapshot(reportId)
  const document = await PDFDocument.create(); const font = await document.embedFont(StandardFonts.Helvetica); const bold = await document.embedFont(StandardFonts.HelveticaBold)
  let page = document.addPage(); let y = 770
  const add = (text: string, size = 10, strong = false) => { if (y < 55) { page = document.addPage(); y = 770 } page.drawText(text.slice(0, 125), { x: 52, y, size, font: strong ? bold : font, color: rgb(0.09, 0.2, 0.27) }); y -= size + 8 }
  add('LEGAL METROLOGY DEPARTMENT', 16, true); add(data.title ?? 'Inspection-related report', 14, true); y -= 8
  for (const line of lines(data)) add(line)
  y -= 10; add('Findings and source records', 12, true)
  if (data.compliance?.length) { add('Automated compliance results are preliminary; officer decisions are shown separately.', 9); for (const item of data.compliance) add(`${item.rule_code ?? 'Rule'} | Automated: ${item.automated_result ?? '—'} | Officer: ${item.officer_result ?? 'Pending Review'} | ${item.automated_reason ?? ''}`, 9) }
  if (data.violations?.length) { add('Confirmed violations recorded for this report:', 10, true); for (const item of data.violations) add(`${item.violation_number} | ${item.violation_title} | ${item.status}`, 9) }
  add('Generated from a preserved database snapshot. This document does not replace authorized legal review.', 8)
  const bytes = await document.save(); return { bytes: new Uint8Array(bytes), checksum: await checksum(new Uint8Array(bytes)) }
}

export async function generateDOCX(reportId: string, snapshot?: ReportSnapshot) {
  const data = snapshot ?? await loadReportSnapshot(reportId)
  const rows = lines(data).map((line) => new TableRow({ children: [new TableCell({ children: [new Paragraph(line)] })] }))
  const document = new Document({ sections: [{ children: [new Paragraph({ text: 'LEGAL METROLOGY DEPARTMENT', heading: HeadingLevel.HEADING_1 }), new Paragraph({ children: [new TextRun({ text: data.title ?? 'Inspection-related report', bold: true })] }), new Table({ rows }), new Paragraph({ text: 'Automated extraction and rule-check results are preliminary. Final findings are subject to authorized officer review and applicable law.' })] }] })
  const buffer = await Packer.toBuffer(document); const bytes = new Uint8Array(buffer); return { bytes, checksum: await checksum(bytes) }
}
