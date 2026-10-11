import type { Key } from '@/lib/i18n/dict'
import type { Permission } from '@/lib/demo/rules'
import type { Role } from '@/lib/demo/types'

// Typed maps, so a missing key is a compile error instead of a blank label.
export const roleName: Record<Role, Key> = {
  owner: 'app.role.owner',
  approver: 'app.role.approver',
  operator: 'app.role.operator',
  accountant: 'app.role.accountant',
}

export const roleDoes: Record<Role, Key> = {
  owner: 'app.role.owner.does',
  approver: 'app.role.approver.does',
  operator: 'app.role.operator.does',
  accountant: 'app.role.accountant.does',
}

export const permName: Record<Permission, Key> = {
  create_payment: 'app.team.perm.create_payment',
  edit_suppliers: 'app.team.perm.edit_suppliers',
  approve: 'app.team.perm.approve',
  approve_wallet: 'app.team.perm.approve_wallet',
  send: 'app.team.perm.send',
  export: 'app.team.perm.export',
  view_audit: 'app.team.perm.view_audit',
  manage_team: 'app.team.perm.manage_team',
  manage_settings: 'app.team.perm.manage_settings',
}

export type PermSection = 'payments' | 'suppliers' | 'records' | 'company'

// Groups the matrix rows into sections; every permission belongs to exactly one.
export const permSections: { id: PermSection; title: Key; perms: Permission[] }[] = [
  { id: 'payments', title: 'app.team.section.payments', perms: ['create_payment', 'approve', 'send'] },
  { id: 'suppliers', title: 'app.team.section.suppliers', perms: ['edit_suppliers', 'approve_wallet'] },
  { id: 'records', title: 'app.team.section.records', perms: ['export', 'view_audit'] },
  { id: 'company', title: 'app.team.section.company', perms: ['manage_team', 'manage_settings'] },
]
