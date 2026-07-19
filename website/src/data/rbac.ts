export const ROLES = [
  'Admin',
  'Doctor',
  'Nurse',
  'Receptionist',
  'Pharmacist',
  'Lab Tech',
  'Compounder / Cashier',
] as const

export interface RbacRow {
  action: string
  allowed: readonly boolean[] // aligned to ROLES order
}

export const RBAC_MATRIX: RbacRow[] = [
  { action: 'Register hospital', allowed: [true, false, false, false, false, false, false] },
  { action: 'Manage staff', allowed: [true, false, false, false, false, false, false] },
  { action: 'View audit logs', allowed: [true, false, false, false, false, false, false] },
  { action: 'Manage transfers', allowed: [true, false, false, false, false, false, false] },
  { action: 'Register patient', allowed: [true, true, true, true, false, false, false] },
  { action: 'Bed allocation', allowed: [true, true, true, true, false, false, false] },
  { action: 'Check branch stock', allowed: [true, true, true, true, true, true, true] },
  { action: 'Raise transfer request', allowed: [true, true, true, false, true, true, true] },
  { action: 'Approve requisitions', allowed: [true, false, false, false, false, false, false] },
  { action: 'Manage diagnostics', allowed: [true, true, true, false, false, true, false] },
  { action: 'AI inventory analytics', allowed: [true, false, false, false, false, false, false] },
]
