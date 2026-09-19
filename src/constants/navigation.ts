import type { LucideIcon } from 'lucide-react'
import { Bell, Building2, ClipboardCheck, FileBarChart, FileText, FlaskConical, Gauge, History, LayoutDashboard, Package, Search, Settings, ShieldCheck, Store, ScanLine, Users, AlertTriangle } from 'lucide-react'
import type { ModuleKey } from '../types'
import type { Role } from '../types/auth'

export type NavItem = { label: string; path: string; icon: LucideIcon; key?: ModuleKey }

export const departmentNavigation: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Offices', path: '/offices', icon: Building2, key: 'offices' },
  { label: 'Officers', path: '/officers', icon: Users, key: 'officers' },
  { label: 'Businesses', path: '/businesses', icon: Store, key: 'businesses' },
  { label: 'Products', path: '/products', icon: Package, key: 'products' },
  { label: 'Inspections', path: '/inspections', icon: ClipboardCheck, key: 'inspections' },
  { label: 'OCR & Label Analysis', path: '/ocr', icon: ScanLine, key: 'ocr' },
  { label: 'Compliance', path: '/compliance', icon: ShieldCheck, key: 'compliance' },
  { label: 'Samples & Laboratory', path: '/samples', icon: FlaskConical, key: 'samples' },
  { label: 'Violations', path: '/violations', icon: AlertTriangle, key: 'violations' },
  { label: 'Reports', path: '/reports', icon: FileBarChart, key: 'reports' },
  { label: 'Search & History', path: '/search', icon: History, key: 'search' },
]

export const utilityNavigation: NavItem[] = [
  { label: 'Notifications', path: '/notifications', icon: Bell, key: 'notifications' },
  { label: 'Settings', path: '/settings', icon: Settings, key: 'settings' },
]

export const businessNavigation: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: Gauge },
  { label: 'My Business', path: '/businesses', icon: Store },
  { label: 'My Products', path: '/products', icon: Package },
  { label: 'My Applications', path: '/business-applications', icon: ClipboardCheck },
  { label: 'My Inspections', path: '/inspections', icon: ShieldCheck },
  { label: 'Compliance Information', path: '/compliance', icon: Search },
  { label: 'Reports', path: '/reports', icon: FileBarChart },
]

const roleNavigation: Record<Role, NavItem[]> = {
  super_admin: [...departmentNavigation, { label: 'Users', path: '/users', icon: Users }, ...utilityNavigation],
  controller: departmentNavigation.filter((item) => !['OCR & Label Analysis'].includes(item.label)),
  assistant_controller: departmentNavigation.filter((item) => !['Offices', 'OCR & Label Analysis'].includes(item.label)),
  inspector: departmentNavigation.filter((item) => !['Offices', 'Officers'].includes(item.label)),
  clerk: departmentNavigation.filter((item) => ['Dashboard', 'Businesses', 'Products', 'Inspections', 'Search & History'].includes(item.label)).concat([{ label: 'Documents', path: '/documents', icon: FileText }]),
  laboratory_user: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }, { label: 'Assigned Samples', path: '/assigned-samples', icon: FlaskConical }, { label: 'Laboratory Reports', path: '/laboratory', icon: FileBarChart }, { label: 'Search', path: '/search', icon: Search }],
  manufacturer: businessNavigation.concat([{ label: 'Documents', path: '/documents', icon: FileText }]),
  packer: businessNavigation.concat([{ label: 'Documents', path: '/documents', icon: FileText }]),
  importer: businessNavigation.concat([{ label: 'Documents', path: '/documents', icon: FileText }]),
  dealer: businessNavigation.concat([{ label: 'Documents', path: '/documents', icon: FileText }]),
  retailer: businessNavigation.concat([{ label: 'Documents', path: '/documents', icon: FileText }]),
}

export function getNavigationForRole(role: Role | null | undefined) {
  return role ? roleNavigation[role] : []
}
