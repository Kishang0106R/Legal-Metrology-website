import type { Role } from '../types/auth'

export type Permission = `${string}.${string}`
const allDepartment: Permission[] = ['offices.view', 'offices.create', 'offices.edit', 'officers.view', 'officers.create', 'officers.edit', 'businesses.view', 'businesses.create', 'businesses.edit', 'products.view', 'products.create', 'products.edit', 'inspections.view', 'inspections.create', 'inspections.edit', 'compliance.view', 'compliance.review', 'laboratory.view', 'laboratory.create', 'laboratory.upload_report', 'violations.view', 'violations.create', 'violations.review', 'reports.view', 'reports.generate', 'reports.download', 'users.view', 'users.create', 'users.edit', 'users.delete']
export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: allDepartment,
  controller: [...allDepartment.filter((permission) => !permission.startsWith('users.'))],
  assistant_controller: allDepartment.filter((permission) => !permission.startsWith('users.') && !permission.startsWith('offices.')),
  inspector: ['businesses.view', 'products.view', 'inspections.view', 'inspections.create', 'inspections.edit', 'compliance.view', 'compliance.review', 'laboratory.view', 'violations.view', 'violations.create', 'reports.view', 'reports.generate'],
  clerk: ['businesses.view', 'businesses.create', 'products.view', 'products.create', 'inspections.view', 'inspections.create', 'inspections.edit', 'reports.view'],
  laboratory_user: ['laboratory.view', 'laboratory.create', 'laboratory.upload_report', 'reports.view', 'search.view'],
  manufacturer: ['businesses.view', 'products.view', 'products.create', 'inspections.view', 'compliance.view', 'reports.view'],
  packer: ['businesses.view', 'products.view', 'products.create', 'inspections.view', 'compliance.view', 'reports.view'],
  importer: ['businesses.view', 'products.view', 'products.create', 'inspections.view', 'compliance.view', 'reports.view'],
  dealer: ['businesses.view', 'products.view', 'products.create', 'inspections.view', 'compliance.view', 'reports.view'],
  retailer: ['businesses.view', 'products.view', 'products.create', 'inspections.view', 'compliance.view', 'reports.view'],
}
export function hasPermission(role: Role | null | undefined, permission: Permission) { return Boolean(role && rolePermissions[role]?.includes(permission)) }
export function canView(role: Role | null | undefined, resource: string) { return hasPermission(role, `${resource}.view`) }
export function canCreate(role: Role | null | undefined, resource: string) { return hasPermission(role, `${resource}.create`) }
export function canEdit(role: Role | null | undefined, resource: string) { return hasPermission(role, `${resource}.edit`) }
export function canDelete(role: Role | null | undefined, resource: string) { return hasPermission(role, `${resource}.delete`) }
