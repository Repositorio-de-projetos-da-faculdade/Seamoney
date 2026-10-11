// Shapes returned by the Java rules API (see rules-api/.../domain). The web app only displays them:
// all business rules (fees, savings, status changes, reconciliation) live in the Java service.

export type OrderStatus = 'quoted' | 'sending' | 'sent' | 'reconciled'

export interface Recon {
  txHash: string
  logIndex: number
  blockNumber: number
  matchedAt: string
  expectedCents: number
  paidCents: number
  checks: { token: boolean; recipient: boolean; amount: boolean; memo: boolean; receipt: boolean }
}

export interface Order {
  id: string
  reference: string
  supplierId: string
  supplierName: string
  supplierCountry: string | null
  supplierWallet: string
  invoiceNumber: string
  amountCents: number
  currency: string
  dueDate: string | null
  feeBps: number
  feeCents: number
  totalCents: number
  bankFeePct: number
  fxRate: number | null
  totalBrlCents: number | null
  status: OrderStatus
  extractionSource: string | null
  invoiceFilename: string | null
  txHash: string | null
  blockNumber: number | null
  logIndex: number | null
  memoHex: string | null
  confirmMs: number | null
  paidAt: string | null
  reconciledAt: string | null
  recon: Recon | null
  error: string | null
  isDemo: boolean
  createdAt: string
  updatedAt: string
  /** What a bank wire would have cost under the assumed bank fee, and what the route saves. */
  bankCostCents: number
  savingsCents: number
}

export interface OrderEvent {
  id: number
  orderId: string
  ts: string
  type: string
  detail: string | null
}

export interface Stats {
  savingsCents: number
  inProgress: number
  reconciled: number
  avgConfirmMs: number | null
  volumeCents: number
  hasDemo: boolean
}

export interface MonthPoint {
  month: string // YYYY-MM
  bankCents: number
  routeCents: number
}

export interface TxInfo {
  status: 'success' | 'reverted'
  blockNumber: number
  timestamp: string
}

export interface ProofOrder {
  id: string
  invoiceNumber: string
  amountCents: number
  supplierName: string
  reference: string
  network: 'tempo' | 'solana'
  txHash: string
  paidAt: string | null
  companyName: string | null
  supplierWallet: string | null
  supplierCity: string | null
  supplierPort: string | null
  blockNumber: number | null
  reconciledAt: string | null
  recon: Recon | null
}

export interface Proof {
  order: ProofOrder
  tx: TxInfo | null
}

export interface Comparison {
  bankCents: number
  routeCents: number
  savingsCents: number
  savingsShare: number
  feeBps: number
}

export type Role = 'OWNER' | 'APPROVER' | 'OPERATOR' | 'ACCOUNTANT'

/** GET /api/auth/me: the signed-in user and the company the session acts for. */
export interface Session {
  id: string
  email: string
  organizationId: string
  organizationName: string
  role: Role
  organizations: { id: string; name: string; role: Role }[]
}
