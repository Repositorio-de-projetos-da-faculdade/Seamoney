// The workspace connected to the rules service (testnet mode). Payment orders live in the Java service, so the
// operator and the approver can sit at different computers: actions go to Java first, and `mergeLiveOrders` brings
// what others did into this browser's view. People, suppliers and wallets stay the fictitious ones of the workspace.
// No imports from the store on purpose: the merge is a pure function, unit-tested directly by `node --test`.
import { quote } from './pricing.ts'
import { activeWallet, approvalHash, logActivity, nextId } from './rules.ts'
import type { ActivityType, DemoState, Network, Payment, PaymentStatus, ReconChecks, Role, WalletStatus } from './types.ts'

/** A decision as the rules service records it: who (user and role), when, and why or on which data. */
export interface LiveDecision {
  by: string | null
  role: string | null
  at: string
  dataHash?: string
  reason?: string
  auto: boolean
}

/** The fields of a rules-service order this workspace reads (see rules-api domain/Order.java). */
export interface LiveOrder {
  id: string
  /** The signed link id of the public proof page (the order id alone does not open it). */
  proofId?: string
  reference: string
  status: Exclude<PaymentStatus, 'in_review'>
  supplierName: string
  supplierWallet: string
  network: Network
  invoiceNumber: string
  amountCents: number
  dueDate: string | null
  extractionSource: Payment['source']
  invoiceFilename: string | null
  createdAt: string
  createdRole: string | null
  approval: LiveDecision | null
  closure: LiveDecision | null
  txHash: string | null
  blockNumber: number | null
  logIndex: number | null
  confirmMs: number | null
  paidAt: string | null
  recon: { matchedAt: string; expectedCents: number; paidCents: number; checks: ReconChecks } | null
}

const memberFor = (state: DemoState, role: string | null | undefined): string | null =>
  role ? (state.members.find((m) => m.role === (role.toLowerCase() as Role) && m.status === 'active')?.id ?? null) : null

const sameAddress = (network: Network, a: string, b: string) => (network === 'tempo' ? a.toLowerCase() === b.toLowerCase() : a === b)

/** Where an order is in its life; a later stage never goes back to an earlier one when merging. */
const STAGE: Record<PaymentStatus, number> = {
  pending_approval: 0,
  approved: 1,
  sending: 2,
  sent: 3,
  reconciled: 4,
  in_review: 4,
  rejected: 5,
  cancelled: 5,
}

const ACTIVITY: Partial<Record<PaymentStatus, ActivityType>> = {
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  sent: 'payment_sent',
  reconciled: 'reconciled',
}

/** The local payment brought up to what the rules service says, without ever moving it backwards. */
function advance(state: DemoState, p: Payment, o: LiveOrder): Payment {
  const next: Payment = { ...p, liveOrderId: o.id }
  // a payment made before links were signed learns its proof link here
  if (p.settlement?.mode === 'testnet' && o.proofId && p.settlement.liveProofId !== o.proofId) {
    next.settlement = { ...p.settlement, liveProofId: o.proofId }
  }
  // in_review and sending are decided here (a person, or a send in flight in this tab): the service does not overrule them
  if (p.status === 'in_review' || p.status === 'sending' || STAGE[o.status] < STAGE[p.status]) return next
  next.status = o.status
  if (o.approval && !p.approval) {
    // the local hash is what this workspace checks before sending; the service keeps its own bound copy
    next.approval = { by: memberFor(state, o.approval.role), at: o.approval.at, dataHash: approvalHash(state, p), auto: o.approval.auto }
  }
  if (o.status === 'rejected' && o.closure && !p.rejection) next.rejection = { by: memberFor(state, o.closure.role) ?? p.createdBy, at: o.closure.at, reason: o.closure.reason ?? '' }
  if (o.status === 'cancelled' && o.closure && !p.cancellation) {
    next.cancellation = { by: memberFor(state, o.closure.role) ?? p.createdBy, at: o.closure.at, reason: o.closure.reason ?? '' }
  }
  if (o.txHash && o.blockNumber != null && !p.settlement) {
    const supplier = state.suppliers.find((s) => s.id === p.supplierId)
    const wallet = supplier ? activeWallet(supplier, p.network) : undefined
    next.settlement = {
      mode: 'testnet',
      network: p.network,
      walletId: wallet?.id ?? '',
      txHash: o.txHash,
      blockNumber: o.blockNumber,
      logIndex: o.logIndex ?? 0,
      confirmMs: o.confirmMs ?? 0,
      paidAt: o.paidAt ?? o.createdAt,
      liveOrderId: o.id,
      liveProofId: o.proofId,
    }
  }
  if (o.recon && !p.recon) next.recon = { matchedAt: o.recon.matchedAt, checks: o.recon.checks, expectedCents: o.recon.expectedCents, paidCents: o.recon.paidCents }
  return next
}

/** A payment created at another computer, mapped onto this workspace's supplier and wallet (or null when it cannot be). */
function adopt(state: DemoState, o: LiveOrder, id: string): Payment | null {
  const supplier = state.suppliers.find((s) => s.name.toLowerCase() === o.supplierName.toLowerCase())
  const wallet = supplier ? activeWallet(supplier, o.network) : undefined
  if (!supplier || !wallet || !sameAddress(o.network, wallet.address, o.supplierWallet)) return null
  const createdBy = memberFor(state, o.createdRole) ?? state.members[0].id
  const base: Payment = {
    id,
    reference: o.reference,
    liveOrderId: o.id,
    supplierId: supplier.id,
    network: o.network,
    invoiceNumber: o.invoiceNumber,
    dueDate: o.dueDate,
    source: o.extractionSource,
    invoiceFilename: o.invoiceFilename,
    quote: quote(o.amountCents, state.settings),
    status: 'pending_approval',
    createdBy,
    createdAt: o.createdAt,
    approval: null,
    rejection: null,
    cancellation: null,
    settlement: null,
    recon: null,
    error: null,
  }
  return advance(state, base, o)
}

/**
 * Brings the rules service's orders into the workspace: known payments move forward, payments made at another
 * computer appear (when their supplier and approved wallet exist here too), and each change lands in the activity log.
 */
export function mergeLiveOrders(state: DemoState, orders: LiveOrder[], now: string): DemoState {
  let next = state
  for (const o of orders) {
    if (!/^SM-[0-9A-Z]{8}$/.test(o.reference)) continue
    const local = next.payments.find((p) => p.reference === o.reference)
    if (local) {
      const moved = advance(next, local, o)
      if (moved.status === local.status && moved.liveOrderId === local.liveOrderId) continue
      next = { ...next, payments: next.payments.map((p) => (p.id === local.id ? moved : p)) }
      const type = moved.status !== local.status ? ACTIVITY[moved.status] : undefined
      if (type) next = logActivity(next, type, now, actorOf(moved), { paymentId: moved.id })
      continue
    }
    const issued = nextId(next, 'pay')
    const adopted = adopt(issued.state, o, issued.id)
    if (!adopted) continue
    next = { ...issued.state, payments: [adopted, ...issued.state.payments] }
    next = logActivity(next, 'payment_created', o.createdAt, adopted.createdBy, { paymentId: adopted.id })
  }
  return next
}

function actorOf(p: Payment): string | null {
  if (p.status === 'approved') return p.approval?.by ?? null
  if (p.status === 'rejected') return p.rejection?.by ?? null
  if (p.status === 'cancelled') return p.cancellation?.by ?? null
  return null
}

/* ------------------------------ suppliers and wallets ------------------------------ */

/** A wallet version as the rules service records it (see rules-api domain/SupplierView.java). */
export interface LiveWallet {
  id: string
  network: Network
  address: string
  version: number
  status: WalletStatus
  proposedBy: string | null
  proposedRole: string | null
  proposedAt: string
  approvedBy: string | null
  approvedRole: string | null
  approvedAt: string | null
}

export interface LiveSupplier {
  id: string
  name: string
  country: string | null
  city: string | null
  port: string | null
  email: string | null
  createdAt: string
  wallets: LiveWallet[]
}

/** What a wallet version goes through; merging only ever moves it forward. */
const WALLET_STAGE: Record<WalletStatus, number> = { proposed: 0, approved: 1, revoked: 2 }

/** The workspace's suppliers and wallet history, to start an empty registry in the rules service (demo seed). */
export function seedSuppliers(state: DemoState) {
  return state.suppliers.map((s) => ({
    name: s.name,
    country: s.country,
    city: s.city,
    port: s.port,
    email: s.email,
    wallets: s.wallets.map((w) => ({ network: w.network, address: w.address, version: w.version, status: w.status })),
  }))
}

/**
 * Brings the rules service's suppliers and wallet versions into the workspace: known versions move forward (proposed
 * to approved or revoked), versions proposed or approved at another computer appear, and so do new suppliers.
 */
export function mergeLiveSuppliers(state: DemoState, suppliers: LiveSupplier[], now: string): DemoState {
  let next = state
  for (const ls of suppliers) {
    let local = next.suppliers.find((s) => s.name.toLowerCase() === ls.name.toLowerCase())
    if (!local) {
      const issued = nextId(next, 'sup')
      local = { id: issued.id, liveId: ls.id, name: ls.name, country: ls.country ?? '', port: ls.port ?? '', city: ls.city ?? '', email: ls.email ?? '', wallets: [], createdAt: ls.createdAt }
      next = logActivity({ ...issued.state, suppliers: [local, ...issued.state.suppliers] }, 'supplier_added', ls.createdAt, null, { supplierId: local.id })
    }
    let wallets = local.wallets
    let changed = local.liveId !== ls.id
    for (const lw of ls.wallets) {
      const mine = wallets.find((w) => w.network === lw.network && w.version === lw.version && sameAddress(lw.network, w.address, lw.address))
      if (mine) {
        const forward = WALLET_STAGE[lw.status] > WALLET_STAGE[mine.status]
        if (!forward && mine.liveId === lw.id) continue
        const moved = forward
          ? { ...mine, liveId: lw.id, status: lw.status, approvedBy: mine.approvedBy ?? memberFor(next, lw.approvedRole), approvedAt: mine.approvedAt ?? lw.approvedAt }
          : { ...mine, liveId: lw.id }
        wallets = wallets.map((w) => (w.id === mine.id ? moved : w))
        changed = true
        if (forward && lw.status === 'approved') next = logActivity(next, 'wallet_approved', now, moved.approvedBy, { supplierId: local.id, walletId: mine.id })
        continue
      }
      const issued = nextId(next, 'wal')
      next = issued.state
      const added = {
        id: issued.id,
        liveId: lw.id,
        network: lw.network,
        address: lw.address,
        version: lw.version,
        status: lw.status,
        proposedBy: memberFor(next, lw.proposedRole) ?? next.members[0].id,
        proposedAt: lw.proposedAt,
        approvedBy: memberFor(next, lw.approvedRole),
        approvedAt: lw.approvedAt,
      }
      wallets = [...wallets, added]
      changed = true
      next = logActivity(next, 'wallet_proposed', lw.proposedAt, added.proposedBy, { supplierId: local.id, walletId: added.id })
    }
    if (!changed) continue
    const id = local.id
    next = { ...next, suppliers: next.suppliers.map((s) => (s.id === id ? { ...s, liveId: ls.id, wallets } : s)) }
  }
  return next
}
