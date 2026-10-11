// State changes of the SaaS demo as pure functions: (state, input) -> new state, or a DemoRuleError.
// They mirror the rules of the backend plan: the permission table per role, approval by someone other than the
// creator bound to a hash of the payment data, wallets versioned per network and approved by a second person,
// one active order per invoice, an atomic claim before sending, and reconciliation that opens a review case when a
// check fails instead of ignoring it.
import { quote } from './pricing.ts'
import { sha256Hex } from './sha256.ts'
import type {
  Activity,
  ActivityType,
  DemoState,
  Member,
  Network,
  Payment,
  Reconciliation,
  Role,
  Settings,
  Settlement,
  Supplier,
  Wallet,
} from './types.ts'

export type RuleCode =
  | 'role'
  | 'own_payment'
  | 'own_wallet'
  | 'bad_state'
  | 'hash_mismatch'
  | 'invalid_invoice'
  | 'duplicate_invoice'
  | 'not_reviewed'
  | 'invalid_amount'
  | 'unknown_supplier'
  | 'no_wallet'
  | 'invalid_wallet'
  | 'invalid_name'
  | 'invalid_email'
  | 'duplicate_email'
  | 'last_owner'
  | 'not_found'

export class DemoRuleError extends Error {
  // a plain field, not a parameter property: node --test only strips types
  readonly code: RuleCode
  constructor(code: RuleCode) {
    super(code)
    this.code = code
  }
}

/* ------------------------------ permissions ------------------------------ */

// The permission table of the plan (section 8). Every wallet change is a proposal that another owner or approver
// approves, so "edit suppliers" never puts an address into use on its own.
export type Permission =
  | 'create_payment'
  | 'approve'
  | 'send'
  | 'edit_suppliers'
  | 'approve_wallet'
  | 'manage_team'
  | 'manage_settings'
  | 'export'
  | 'view_audit'

export const PERMISSIONS: readonly Permission[] = [
  'create_payment',
  'edit_suppliers',
  'approve',
  'approve_wallet',
  'send',
  'export',
  'view_audit',
  'manage_team',
  'manage_settings',
]

const GRANTS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  approver: ['create_payment', 'edit_suppliers', 'approve', 'approve_wallet', 'send', 'export', 'view_audit'],
  operator: ['create_payment', 'edit_suppliers'],
  accountant: ['export', 'view_audit'],
}

export const roleCan = (role: Role, permission: Permission) => GRANTS[role].includes(permission)
export const permissionsOf = (role: Role) => GRANTS[role]

/** Why an action is blocked, so the interface can say who can do it instead of hiding the button. */
export type Verdict = { ok: true } | { ok: false; code: RuleCode }

const yes: Verdict = { ok: true }
const no = (code: RuleCode): Verdict => ({ ok: false, code })

export function checkApprove(member: Member, payment: Payment): Verdict {
  if (!roleCan(member.role, 'approve')) return no('role')
  if (payment.status !== 'pending_approval') return no('bad_state')
  if (payment.createdBy === member.id) return no('own_payment')
  return yes
}

export function checkSend(member: Member, payment: Payment): Verdict {
  if (!roleCan(member.role, 'send')) return no('role')
  if (payment.status !== 'approved') return no('bad_state')
  return yes
}

/** Before any money moves: approvers and owners can cancel any order, the creator their own. */
export function checkCancel(member: Member, payment: Payment): Verdict {
  if (payment.status !== 'pending_approval' && payment.status !== 'approved') return no('bad_state')
  if (roleCan(member.role, 'approve')) return yes
  if (roleCan(member.role, 'create_payment') && payment.createdBy === member.id) return yes
  return no('role')
}

/** Looking the transfer up again on the network, when it was not found right after sending. */
export function checkRecheck(member: Member, payment: Payment): Verdict {
  if (!roleCan(member.role, 'send')) return no('role')
  if (payment.status !== 'sent') return no('bad_state')
  return yes
}

export function checkApproveWallet(member: Member, wallet: Wallet): Verdict {
  if (!roleCan(member.role, 'approve_wallet')) return no('role')
  if (wallet.status !== 'proposed') return no('bad_state')
  if (wallet.proposedBy === member.id) return no('own_wallet')
  return yes
}

export const needsApproval = (amountCents: number, settings: Settings) => amountCents >= settings.approvalThresholdCents

/* ------------------------------ validation ------------------------------ */

const ADDRESS: Record<Network, RegExp> = {
  tempo: /^0x[0-9a-fA-F]{40}$/,
  // Base58: no 0, O, I or l; a Solana public key is 32 bytes, 32 to 44 characters
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isWallet = (network: Network, s: string) => ADDRESS[network].test(s)
export const memoBytes = (s: string) => new TextEncoder().encode(s).length
const sameAddress = (network: Network, a: string, b: string) => (network === 'tempo' ? a.toLowerCase() === b.toLowerCase() : a === b)

/** The approved address a payment to this supplier on this network goes to, if any. */
export const activeWallet = (supplier: Supplier, network: Network): Wallet | undefined =>
  supplier.wallets.find((w) => w.network === network && w.status === 'approved')

/** What the approval covers. Change any of these after approval (amount, wallet, due date) and it no longer holds. */
export function approvalPayload(payment: Pick<Payment, 'id' | 'reference' | 'network' | 'invoiceNumber' | 'dueDate' | 'quote'>, supplier: Supplier) {
  const wallet = activeWallet(supplier, payment.network)
  return [
    payment.id,
    payment.reference,
    supplier.id,
    payment.network,
    wallet ? `${wallet.version}:${wallet.address}` : '',
    payment.invoiceNumber,
    payment.quote.amountCents,
    payment.dueDate ?? '',
  ].join('|')
}

/** SHA-256 of the approval payload with today's supplier data. */
export function approvalHash(state: DemoState, payment: Payment): string {
  return sha256Hex(approvalPayload(payment, find(state.suppliers, payment.supplierId)))
}

/* ------------------------------ helpers ------------------------------ */

function find<T extends { id: string }>(list: T[], id: string): T {
  const item = list.find((x) => x.id === id)
  if (!item) throw new DemoRuleError('not_found')
  return item
}

function member(state: DemoState, id: string) {
  return find(state.members, id)
}

function log(state: DemoState, type: ActivityType, at: string, actorId: string | null, ref: Omit<Activity, 'id' | 'at' | 'type' | 'actorId'> = {}): DemoState {
  const seq = state.seq + 1
  const entry: Activity = { id: `act_${seq}`, at, type, actorId, ...ref }
  return { ...state, seq, activity: [entry, ...state.activity] }
}

function patchPayment(state: DemoState, id: string, patch: Partial<Payment>): DemoState {
  return { ...state, payments: state.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
}

function patchSupplier(state: DemoState, id: string, change: (s: Supplier) => Supplier): DemoState {
  return { ...state, suppliers: state.suppliers.map((s) => (s.id === id ? change(s) : s)) }
}

/** The activity log, for changes that arrive from the rules service (see live.ts). */
export const logActivity = log

export function nextId(state: DemoState, prefix: string): { state: DemoState; id: string } {
  const seq = state.seq + 1
  return { state: { ...state, seq }, id: `${prefix}_${String(seq).padStart(4, '0')}` }
}

/** Orders that still count for "one active order per invoice". */
const isActive = (p: Payment) => p.status !== 'rejected' && p.status !== 'cancelled'

/* ------------------------------ payments ------------------------------ */

export interface NewPayment {
  supplierId: string
  network: Network
  invoiceNumber: string
  amountCents: number
  dueDate: string | null
  source: Payment['source']
  invoiceFilename: string | null
  /** A person checked the data against the invoice. Required when the AI read it. */
  reviewed: boolean
}

/**
 * Creates and quotes a payment. Below the approval threshold the policy approves it at once; otherwise it waits for
 * a second person. `reference` is the opaque order code that travels as the memo.
 */
export function createPayment(state: DemoState, input: NewPayment, actorId: string, now: string, id: string, reference: string): DemoState {
  const actor = member(state, actorId)
  if (!roleCan(actor.role, 'create_payment')) throw new DemoRuleError('role')
  const invoice = input.invoiceNumber.trim()
  if (!invoice) throw new DemoRuleError('invalid_invoice')
  if (input.source === 'ai' && !input.reviewed) throw new DemoRuleError('not_reviewed')
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new DemoRuleError('invalid_amount')
  const supplier = state.suppliers.find((s) => s.id === input.supplierId)
  if (!supplier) throw new DemoRuleError('unknown_supplier')
  if (!activeWallet(supplier, input.network)) throw new DemoRuleError('no_wallet')
  const taken = state.payments.some((p) => isActive(p) && p.supplierId === supplier.id && p.invoiceNumber.toLowerCase() === invoice.toLowerCase())
  if (taken) throw new DemoRuleError('duplicate_invoice')

  const { settings } = state
  const auto = !needsApproval(input.amountCents, settings)
  const payment: Payment = {
    id,
    reference,
    supplierId: supplier.id,
    network: input.network,
    invoiceNumber: invoice,
    dueDate: input.dueDate || null,
    source: input.source,
    invoiceFilename: input.invoiceFilename,
    quote: quote(input.amountCents, settings),
    status: auto ? 'approved' : 'pending_approval',
    createdBy: actorId,
    createdAt: now,
    approval: null,
    rejection: null,
    cancellation: null,
    settlement: null,
    recon: null,
    error: null,
  }
  if (auto) payment.approval = { by: null, at: now, dataHash: approvalHash(state, payment), auto: true }
  let next: DemoState = { ...state, payments: [payment, ...state.payments] }
  next = log(next, 'payment_created', now, actorId, { paymentId: id })
  return log(next, auto ? 'auto_approved' : 'approval_requested', now, auto ? null : actorId, { paymentId: id })
}

export function approvePayment(state: DemoState, id: string, actorId: string, now: string): DemoState {
  const payment = find(state.payments, id)
  const verdict = checkApprove(member(state, actorId), payment)
  if (!verdict.ok) throw new DemoRuleError(verdict.code)
  const supplier = find(state.suppliers, payment.supplierId)
  if (!activeWallet(supplier, payment.network)) throw new DemoRuleError('no_wallet')
  const dataHash = approvalHash(state, payment)
  const next = patchPayment(state, id, { status: 'approved', approval: { by: actorId, at: now, dataHash, auto: false } })
  return log(next, 'approved', now, actorId, { paymentId: id })
}

export function rejectPayment(state: DemoState, id: string, actorId: string, now: string, reason: string): DemoState {
  const verdict = checkApprove(member(state, actorId), find(state.payments, id))
  if (!verdict.ok) throw new DemoRuleError(verdict.code)
  const next = patchPayment(state, id, { status: 'rejected', rejection: { by: actorId, at: now, reason: reason.trim() } })
  return log(next, 'rejected', now, actorId, { paymentId: id })
}

export function cancelPayment(state: DemoState, id: string, actorId: string, now: string, reason: string): DemoState {
  const verdict = checkCancel(member(state, actorId), find(state.payments, id))
  if (!verdict.ok) throw new DemoRuleError(verdict.code)
  const next = patchPayment(state, id, { status: 'cancelled', cancellation: { by: actorId, at: now, reason: reason.trim() } })
  return log(next, 'cancelled', now, actorId, { paymentId: id })
}

/** True when an approved payment's data no longer matches what was approved. */
export const approvalIsStale = (state: DemoState, payment: Payment) =>
  payment.status === 'approved' && payment.approval?.dataHash !== approvalHash(state, payment)

/** Sends a payment whose approval no longer matches its data back to the approval queue. */
export function requestReapproval(state: DemoState, id: string, actorId: string, now: string): DemoState {
  const payment = find(state.payments, id)
  if (!roleCan(member(state, actorId).role, 'create_payment')) throw new DemoRuleError('role')
  if (!approvalIsStale(state, payment)) throw new DemoRuleError('bad_state')
  if (!activeWallet(find(state.suppliers, payment.supplierId), payment.network)) throw new DemoRuleError('no_wallet')
  if (!needsApproval(payment.quote.amountCents, state.settings)) {
    const approval = { by: null, at: now, dataHash: approvalHash(state, payment), auto: true }
    return log(patchPayment(state, id, { approval }), 'auto_approved', now, null, { paymentId: id })
  }
  const next = patchPayment(state, id, { status: 'pending_approval', approval: null })
  return log(next, 'approval_requested', now, actorId, { paymentId: id })
}

/**
 * The atomic claim: approved -> sending. A second click, another tab or another person finds the payment already
 * claimed and gets `bad_state`. The hash is recomputed from today's data and must equal the approved one.
 */
export function claimSend(state: DemoState, id: string, actorId: string, now: string): DemoState {
  const payment = find(state.payments, id)
  const verdict = checkSend(member(state, actorId), payment)
  if (!verdict.ok) throw new DemoRuleError(verdict.code)
  if (payment.approval?.dataHash !== approvalHash(state, payment)) throw new DemoRuleError('hash_mismatch')
  const next = patchPayment(state, id, { status: 'sending', error: null })
  return log(next, 'payment_started', now, actorId, { paymentId: id })
}

export function completeSend(state: DemoState, id: string, settlement: Settlement): DemoState {
  const payment = find(state.payments, id)
  if (payment.status !== 'sending') throw new DemoRuleError('bad_state')
  const next = patchPayment(state, id, { status: 'sent', settlement })
  return log(next, 'payment_sent', settlement.paidAt, null, { paymentId: id })
}

/** A failed send goes back to approved so it can be retried; the approval still holds. */
export function failSend(state: DemoState, id: string, now: string, message: string): DemoState {
  const payment = find(state.payments, id)
  if (payment.status !== 'sending') throw new DemoRuleError('bad_state')
  const next = patchPayment(state, id, { status: 'approved', error: message })
  return log(next, 'payment_failed', now, null, { paymentId: id })
}

/**
 * The reconciliation job (actorId null) or a person asking for a new lookup. All five checks pass: the invoice
 * closes. Any check fails: the order goes to review for a person to decide, never silently closed.
 */
export function reconcilePayment(state: DemoState, id: string, recon: Reconciliation, actorId: string | null): DemoState {
  const payment = find(state.payments, id)
  if (actorId) {
    const verdict = checkRecheck(member(state, actorId), payment)
    if (!verdict.ok) throw new DemoRuleError(verdict.code)
  } else if (payment.status !== 'sent') throw new DemoRuleError('bad_state')
  const allOk = Object.values(recon.checks).every(Boolean)
  const next = patchPayment(state, id, { status: allOk ? 'reconciled' : 'in_review', recon })
  return log(next, allOk ? 'reconciled' : 'review_opened', recon.matchedAt, null, { paymentId: id })
}

/* ------------------------------ suppliers ------------------------------ */

export interface SupplierProfile {
  name: string
  country: string
  /** UN/LOCODE of the supplier's port */
  port: string
  city: string
  email: string
}

export interface NewSupplier extends SupplierProfile {
  network: Network
  wallet: string
}

function cleanProfile(input: SupplierProfile): SupplierProfile {
  if (!input.name.trim()) throw new DemoRuleError('invalid_name')
  if (input.email.trim() && !EMAIL.test(input.email.trim())) throw new DemoRuleError('invalid_email')
  return {
    name: input.name.trim(),
    country: input.country.trim().toUpperCase().slice(0, 2),
    port: input.port.trim().toUpperCase(),
    city: input.city.trim(),
    email: input.email.trim(),
  }
}

function proposal(supplier: Pick<Supplier, 'wallets'>, network: Network, address: string, by: string, at: string, id: string): Wallet {
  if (!isWallet(network, address)) throw new DemoRuleError('invalid_wallet')
  const versions = supplier.wallets.filter((w) => w.network === network).map((w) => w.version)
  return { id, network, address, version: Math.max(0, ...versions) + 1, status: 'proposed', proposedBy: by, proposedAt: at, approvedBy: null, approvedAt: null }
}

/** A new supplier arrives with its wallet as a proposal: nobody can pay it until a second person approves. */
export function addSupplier(state: DemoState, input: NewSupplier, actorId: string, now: string, id: string, walletId: string): DemoState {
  if (!roleCan(member(state, actorId).role, 'edit_suppliers')) throw new DemoRuleError('role')
  const profile = cleanProfile(input)
  const wallet = proposal({ wallets: [] }, input.network, input.wallet.trim(), actorId, now, walletId)
  const supplier: Supplier = { id, ...profile, wallets: [wallet], createdAt: now }
  let next: DemoState = { ...state, suppliers: [supplier, ...state.suppliers] }
  next = log(next, 'supplier_added', now, actorId, { supplierId: id })
  return log(next, 'wallet_proposed', now, actorId, { supplierId: id, walletId })
}

/** Name, contact and port. Addresses only change through a proposal. */
export function updateSupplier(state: DemoState, id: string, input: SupplierProfile, actorId: string, now: string): DemoState {
  if (!roleCan(member(state, actorId).role, 'edit_suppliers')) throw new DemoRuleError('role')
  find(state.suppliers, id)
  const profile = cleanProfile(input)
  return log(
    patchSupplier(state, id, (s) => ({ ...s, ...profile })),
    'supplier_updated',
    now,
    actorId,
    { supplierId: id },
  )
}

/** Proposes a new address (or a first one on another network). An earlier open proposal on that network is dropped. */
export function proposeWallet(state: DemoState, supplierId: string, network: Network, address: string, actorId: string, now: string, walletId: string): DemoState {
  if (!roleCan(member(state, actorId).role, 'edit_suppliers')) throw new DemoRuleError('role')
  const supplier = find(state.suppliers, supplierId)
  const clean = address.trim()
  const current = activeWallet(supplier, network)
  if (current && sameAddress(network, current.address, clean)) throw new DemoRuleError('bad_state')
  const kept = supplier.wallets.map((w) => (w.network === network && w.status === 'proposed' ? { ...w, status: 'revoked' as const } : w))
  const wallet = proposal({ wallets: kept }, network, clean, actorId, now, walletId)
  const next = patchSupplier(state, supplierId, (s) => ({ ...s, wallets: [...kept, wallet] }))
  return log(next, 'wallet_proposed', now, actorId, { supplierId, walletId })
}

/**
 * A second person puts the proposed address into use; the previous one on that network is revoked. Approved payments
 * to this supplier on that network now carry a stale hash and need a fresh approval before they can be sent.
 */
export function approveWallet(state: DemoState, supplierId: string, walletId: string, actorId: string, now: string): DemoState {
  const supplier = find(state.suppliers, supplierId)
  const wallet = find(supplier.wallets, walletId)
  const verdict = checkApproveWallet(member(state, actorId), wallet)
  if (!verdict.ok) throw new DemoRuleError(verdict.code)
  const wallets = supplier.wallets.map((w) => {
    if (w.id === walletId) return { ...w, status: 'approved' as const, approvedBy: actorId, approvedAt: now }
    if (w.network === wallet.network && w.status === 'approved') return { ...w, status: 'revoked' as const }
    return w
  })
  return log(
    patchSupplier(state, supplierId, (s) => ({ ...s, wallets })),
    'wallet_approved',
    now,
    actorId,
    { supplierId, walletId },
  )
}

export function rejectWallet(state: DemoState, supplierId: string, walletId: string, actorId: string, now: string): DemoState {
  const supplier = find(state.suppliers, supplierId)
  const wallet = find(supplier.wallets, walletId)
  const actor = member(state, actorId)
  // the proposer may withdraw their own proposal; anyone else needs the right to approve wallets
  const own = wallet.proposedBy === actorId && roleCan(actor.role, 'edit_suppliers')
  if (!own && !roleCan(actor.role, 'approve_wallet')) throw new DemoRuleError('role')
  if (wallet.status !== 'proposed') throw new DemoRuleError('bad_state')
  const wallets = supplier.wallets.map((w) => (w.id === walletId ? { ...w, status: 'revoked' as const } : w))
  return log(
    patchSupplier(state, supplierId, (s) => ({ ...s, wallets })),
    'wallet_rejected',
    now,
    actorId,
    { supplierId, walletId },
  )
}

/* ------------------------------ team and settings ------------------------------ */

export function inviteMember(state: DemoState, input: { name: string; email: string; role: Role }, actorId: string, now: string, id: string): DemoState {
  if (!roleCan(member(state, actorId).role, 'manage_team')) throw new DemoRuleError('role')
  const email = input.email.trim().toLowerCase()
  if (!input.name.trim()) throw new DemoRuleError('invalid_name')
  if (!EMAIL.test(email)) throw new DemoRuleError('invalid_email')
  if (state.members.some((m) => m.email.toLowerCase() === email)) throw new DemoRuleError('duplicate_email')
  const invited: Member = { id, name: input.name.trim(), email, role: input.role, status: 'invited', joinedAt: now }
  const next = { ...state, members: [...state.members, invited] }
  return log(next, 'member_invited', now, actorId, { memberId: id })
}

export function changeRole(state: DemoState, memberId: string, role: Role, actorId: string, now: string): DemoState {
  if (!roleCan(member(state, actorId).role, 'manage_team')) throw new DemoRuleError('role')
  const target = member(state, memberId)
  const owners = state.members.filter((m) => m.role === 'owner' && m.status === 'active')
  if (target.role === 'owner' && role !== 'owner' && owners.length <= 1) throw new DemoRuleError('last_owner')
  const next = { ...state, members: state.members.map((m) => (m.id === memberId ? { ...m, role } : m)) }
  return log(next, 'role_changed', now, actorId, { memberId })
}

export function updateSettings(state: DemoState, patch: Partial<Settings>, actorId: string, now: string): DemoState {
  if (!roleCan(member(state, actorId).role, 'manage_settings')) throw new DemoRuleError('role')
  // the route fee is a product decision, not a workspace setting
  const { feeBps: _ignored, ...allowed } = patch
  void _ignored
  if (allowed.approvalThresholdCents != null && (!Number.isInteger(allowed.approvalThresholdCents) || allowed.approvalThresholdCents < 0)) {
    throw new DemoRuleError('invalid_amount')
  }
  const next = { ...state, settings: { ...state.settings, ...allowed } }
  return log(next, 'settings_changed', now, actorId)
}
