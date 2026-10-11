// Shapes of the self-contained SaaS demo (/app). Everything here is mock data that lives in the visitor's browser.
// The live prototype (/dashboard) does not use these: it reads the Java rules API (see ../types.ts).
// The model follows the team's backend plan: roles per company, supplier wallets versioned per network and approved
// by a second person, a payment order with an opaque reference as memo, approval bound to a hash, automatic
// reconciliation that opens a review case when a check fails.

export type Role = 'owner' | 'approver' | 'operator' | 'accountant'
export const ROLES: readonly Role[] = ['owner', 'approver', 'operator', 'accountant']

/** Settlement networks. Each order picks the one its supplier receives on. */
export type Network = 'tempo' | 'solana'
export const NETWORKS: readonly Network[] = ['tempo', 'solana']

export interface Member {
  id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'invited'
  joinedAt: string
}

export type WalletStatus = 'proposed' | 'approved' | 'revoked'

/** One version of a supplier's receiving address on one network. A new or changed address needs a second person. */
export interface Wallet {
  id: string
  network: Network
  /** 0x hex on Tempo, Base58 on Solana */
  address: string
  /** 1, 2, 3... per supplier and network */
  version: number
  status: WalletStatus
  proposedBy: string
  proposedAt: string
  approvedBy: string | null
  approvedAt: string | null
}

export interface Supplier {
  id: string
  name: string
  /** ISO 3166-1 alpha-2 */
  country: string
  /** Port the supplier ships from (UN/LOCODE), where its route ends on the chart. */
  port: string
  /** Port city, as written on the chart. */
  city: string
  email: string
  wallets: Wallet[]
  createdAt: string
}

export type PaymentStatus = 'pending_approval' | 'approved' | 'sending' | 'sent' | 'reconciled' | 'in_review' | 'rejected' | 'cancelled'
export type SettlementMode = 'simulated' | 'testnet'

/** Same fields and rounding as rules-api Pricing (integer cents). */
export interface Quote {
  amountCents: number
  feeBps: number
  feeCents: number
  totalCents: number
  bankFeePct: number
  bankCostCents: number
  savingsCents: number
  fxRate: number
  totalBrlCents: number
}

export interface Settlement {
  mode: SettlementMode
  network: Network
  /** The wallet version it was paid to; later address changes do not rewrite history. */
  walletId: string
  /** Transaction hash on Tempo, signature on Solana. */
  txHash: string
  /** Block on Tempo, slot on Solana. */
  blockNumber: number
  logIndex: number
  confirmMs: number
  paidAt: string
  /** Order id in the Java rules API when the payment really went to the Tempo testnet. */
  liveOrderId?: string
}

export interface ReconChecks {
  token: boolean
  recipient: boolean
  amount: boolean
  memo: boolean
  receipt: boolean
}

export interface Reconciliation {
  matchedAt: string
  checks: ReconChecks
  expectedCents: number
  paidCents: number
}

/** A second person signs off on a hash of the payment data, so a later change (amount, wallet) voids it. */
export interface Approval {
  by: string | null
  at: string
  dataHash: string
  /** Below the approval threshold the policy approves on its own. */
  auto: boolean
}

export interface Decision {
  by: string
  at: string
  reason: string
}

export type InvoiceSource = 'ai' | 'demo' | 'manual'

export interface Payment {
  id: string
  /** Opaque order code, unique in the whole system. It is the memo of the transfer; the invoice number never is. */
  reference: string
  supplierId: string
  network: Network
  invoiceNumber: string
  dueDate: string | null
  source: InvoiceSource
  invoiceFilename: string | null
  quote: Quote
  status: PaymentStatus
  createdBy: string
  createdAt: string
  approval: Approval | null
  rejection: Decision | null
  cancellation: Decision | null
  settlement: Settlement | null
  recon: Reconciliation | null
  error: string | null
}

export type ActivityType =
  | 'payment_created'
  | 'approval_requested'
  | 'auto_approved'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'payment_started'
  | 'payment_sent'
  | 'payment_failed'
  | 'reconciled'
  | 'review_opened'
  | 'supplier_added'
  | 'supplier_updated'
  | 'wallet_proposed'
  | 'wallet_approved'
  | 'wallet_rejected'
  | 'member_invited'
  | 'role_changed'
  | 'settings_changed'

export interface Activity {
  id: string
  at: string
  type: ActivityType
  /** null when the system did it (policy, reconciliation job). */
  actorId: string | null
  paymentId?: string
  supplierId?: string
  walletId?: string
  memberId?: string
}

export interface Settings {
  companyName: string
  /** Payments at or above this amount need a second person to approve them. */
  approvalThresholdCents: number
  /** Assumed cost of a bank wire, used only to estimate savings. */
  bankFeePct: number
  /** Simulated USD/BRL rate. No real exchange happens. */
  fxRate: number
  feeBps: number
  /** Applies to Tempo only: Solana payments are always simulated in this demo. */
  settlementMode: SettlementMode
  notifyApprovals: boolean
  notifyReconciled: boolean
  weeklyDigest: boolean
}

export interface DemoState {
  version: number
  sessionMemberId: string | null
  members: Member[]
  suppliers: Supplier[]
  payments: Payment[]
  activity: Activity[]
  settings: Settings
  /** Notifications older than this were seen. */
  readAt: string
  /** Counter for new ids. */
  seq: number
}
