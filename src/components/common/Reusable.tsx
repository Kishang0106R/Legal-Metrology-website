import type { ReactNode } from 'react'
import { Bell, X } from 'lucide-react'

export function Breadcrumbs({ items }: { items: string[] }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={item} className={index === items.length - 1 ? 'breadcrumb-current' : ''}>{item}{index < items.length - 1 && ' / '}</span>)}</nav>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><div className="modal-heading"><h2>{title}</h2>{onClose && <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>}</div>{children}</div></div>
}

export function ConfirmationDialog({ title, description, confirmLabel = 'Confirm', onCancel, onConfirm }: { title: string; description: string; confirmLabel?: string; onCancel?: () => void; onConfirm?: () => void }) {
  return <Modal title={title} onClose={onCancel}><p className="dialog-copy">{description}</p><div className="dialog-actions"><button className="button button-ghost" onClick={onCancel}>Cancel</button><button className="button button-primary" onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}

export function NotificationPanel({ children }: { children?: ReactNode }) {
  return <section className="notification-panel"><div className="panel-heading"><Bell size={17} /><h3>Notifications</h3></div>{children ?? <p className="muted-note">No new notifications.</p>}</section>
}

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
