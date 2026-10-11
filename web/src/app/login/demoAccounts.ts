import type { Role } from '@/lib/types'

// The accounts the Java demo seed creates (rules-api DemoSeeder). Fictional companies, test data only.
const COMPANIES = [
  { prefix: 'porto', name: 'Porto Claro Importadora' },
  { prefix: 'acme', name: 'Acme Corp' },
] as const
const ROLES: { role: Role; slug: string }[] = [
  { role: 'APPROVER', slug: 'approver' },
  { role: 'OPERATOR', slug: 'operator' },
  { role: 'OWNER', slug: 'owner' },
  { role: 'ACCOUNTANT', slug: 'accountant' },
]

export const DEMO_PASSWORD = 'demo123'

export const demoAccounts = COMPANIES.flatMap((c) =>
  ROLES.map(({ role, slug }) => ({ company: c.name, role, email: `${c.prefix}.${slug}@example.com` })),
)
