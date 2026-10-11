// The workspace connected to the rules service (testnet mode). Payment orders live in the Java service, so the
// operator and the approver can sit at different computers: actions go to Java first, and `mergeLiveOrders` brings
// what others did into this browser's view. People, suppliers and wallets stay the fictitious ones of the workspace.
// No imports from the store on purpose: the merge is a pure function, unit-tested directly by `node --test`.
import { quote } from './pricing.ts'
import { activeWallet, approvalHash, logActivity, nextId } from './rules.ts'
import type { ActivityType, DemoState, Network, Payment, PaymentStatus, ReconChecks, Role } from './types.ts'

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
