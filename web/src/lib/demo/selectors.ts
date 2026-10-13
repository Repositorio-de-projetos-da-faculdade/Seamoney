// Read-only views over the demo state: numbers for the overview, each person's to-do list, notifications.
import { activeWallet, approvalIsStale, checkApprove, checkApproveWallet, checkSend, roleCan } from './rules.ts'
import type { Activity, DemoState, Member, Payment, PaymentStatus, Supplier, Wallet } from './types.ts'

/** Orders that are still moving: waiting for someone, or on their way. */
export const OPEN: readonly PaymentStatus[] = ['pending_approval', 'approved', 'sending', 'sent']
/** Orders that need a person's attention because something did not go as planned. */
export const TROUBLE: readonly PaymentStatus[] = ['in_review']
/** Orders that ended without money moving. */
export const STOPPED: readonly PaymentStatus[] = ['rejected', 'cancelled']

export const supplierOf = (state: DemoState, payment: Payment): Supplier | undefined => state.suppliers.find((s) => s.id === payment.supplierId)
export const memberOf = (state: DemoState, id: string | null | undefined): Member | undefined => (id ? state.members.find((m) => m.id === id) : undefined)
export const paymentOf = (state: DemoState, id: string): Payment | undefined => state.payments.find((p) => p.id === id)
export const supplierById = (state: DemoState, id: string): Supplier | undefined => state.suppliers.find((s) => s.id === id)

/** The address the payment went to, or for an unpaid one the approved version it would go to now. */
export const walletOf = (state: DemoState, payment: Payment): Wallet | undefined => {
  const supplier = supplierOf(state, payment)
  if (!supplier) return undefined
  if (payment.settlement) return supplier.wallets.find((w) => w.id === payment.settlement!.walletId)
  return activeWallet(supplier, payment.network)
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function overviewStats(state: DemoState, nowMs: number) {
  const paid = state.payments.filter((p) => p.settlement)
  const confirm = paid.map((p) => p.settlement!.confirmMs)
  const month = new Date(nowMs).toISOString().slice(0, 7)
  const paidThisMonth = paid.filter((p) => p.settlement!.paidAt.startsWith(month))
  const open = state.payments.filter((p) => OPEN.includes(p.status))
  return {
    savingsCents: sum(paid.map((p) => p.quote.savingsCents)),
    volumeCents: sum(paid.map((p) => p.quote.amountCents)),
    feesCents: sum(paid.map((p) => p.quote.feeCents)),
    monthCents: sum(paidThisMonth.map((p) => p.quote.amountCents)),
    monthCount: paidThisMonth.length,
    openCents: sum(open.map((p) => p.quote.amountCents)),
    openCount: open.length,
    reconciled: state.payments.filter((p) => p.status === 'reconciled').length,
    paidCount: paid.length,
    avgConfirmMs: confirm.length ? Math.round(sum(confirm) / confirm.length) : null,
  }
}

/** Bank cost vs route cost of what was paid, per calendar month (UTC), oldest first. */
export function monthlySeries(state: DemoState, nowMs: number, months = 7) {
  const now = new Date(nowMs)
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
  return keys.map((month) => {
    const inMonth = state.payments.filter((p) => p.settlement?.paidAt.startsWith(month))
    return {
      month,
      count: inMonth.length,
      amountCents: sum(inMonth.map((p) => p.quote.amountCents)),
      bankCents: sum(inMonth.map((p) => p.quote.bankCostCents)),
      routeCents: sum(inMonth.map((p) => p.quote.feeCents)),
    }
  })
}

export type Task =
  | { kind: 'approve'; payment: Payment }
  | { kind: 'send'; payment: Payment }
  | { kind: 'reapprove'; payment: Payment }
  | { kind: 'wallet'; supplier: Supplier; wallet: Wallet }

/** What this person can move forward right now, oldest first within each kind. */
export function tasksFor(state: DemoState, member: Member): Task[] {
  const oldest = (a: Payment, b: Payment) => a.createdAt.localeCompare(b.createdAt)
  const payments = [...state.payments].sort(oldest)
  const stale = (p: Payment) => approvalIsStale(state, p)
  const wallets: Task[] = state.suppliers.flatMap((supplier) =>
    supplier.wallets.filter((w) => checkApproveWallet(member, w).ok).map((wallet) => ({ kind: 'wallet' as const, supplier, wallet })),
  )
  return [
    ...payments.filter((p) => checkApprove(member, p).ok).map((payment) => ({ kind: 'approve' as const, payment })),
    ...wallets,
    ...payments.filter((p) => checkSend(member, p).ok && !stale(p)).map((payment) => ({ kind: 'send' as const, payment })),
    ...payments
      .filter((p) => stale(p) && roleCan(member.role, 'create_payment'))
      .map((payment) => ({ kind: 'reapprove' as const, payment })),
  ]
}

/** Payments this person created that are waiting for someone else. */
export const waitingOnOthers = (state: DemoState, member: Member) =>
  state.payments.filter((p) => p.status === 'pending_approval' && p.createdBy === member.id)

/** Activity worth telling this person about, newest first. */
export function notificationsFor(state: DemoState, member: Member): Activity[] {
  const mine = (id?: string) => !!id && paymentOf(state, id)?.createdBy === member.id
  return state.activity
    .filter((a) => a.actorId !== member.id)
    .filter((a) => {
      switch (a.type) {
        case 'approval_requested':
          return state.settings.notifyApprovals && roleCan(member.role, 'approve') && !mine(a.paymentId)
        case 'wallet_proposed':
          return roleCan(member.role, 'approve_wallet')
        case 'approved':
        case 'rejected':
        case 'cancelled':
          return mine(a.paymentId)
        case 'reconciled':
          return state.settings.notifyReconciled
        case 'review_opened':
        case 'payment_failed':
        case 'member_invited':
          return true
        default:
          return false
      }
    })
    .slice(0, 30)
}

export const unreadCount = (state: DemoState, member: Member) => notificationsFor(state, member).filter((a) => a.at > state.readAt).length

export function supplierTotals(state: DemoState, supplierId: string) {
  const payments = state.payments.filter((p) => p.supplierId === supplierId)
  const paid = payments.filter((p) => p.settlement)
  const last = paid.map((p) => p.settlement!.paidAt).sort().at(-1) ?? null
  return { count: payments.length, paidCents: sum(paid.map((p) => p.quote.amountCents)), lastPaidAt: last, open: payments.filter((p) => OPEN.includes(p.status)).length }
}

/** Who can take the next step of a payment (approve or send), so the interface can name them. */
export function nextActors(state: DemoState, payment: Payment): Member[] {
  const active = state.members.filter((m) => m.status === 'active')
  if (payment.status === 'pending_approval') return active.filter((m) => roleCan(m.role, 'approve') && m.id !== payment.createdBy)
  if (payment.status === 'approved') return active.filter((m) => roleCan(m.role, 'send'))
  return []
}

/** Who can approve a proposed wallet: an owner or approver other than whoever proposed it. */
export const walletApprovers = (state: DemoState, wallet: Wallet): Member[] =>
  state.members.filter((m) => m.status === 'active' && roleCan(m.role, 'approve_wallet') && m.id !== wallet.proposedBy)

/**
 * Where the supplier's proof lives. A testnet payment has a public page served from the rules service, which checks
 * the transaction on-chain and opens from any browser; a simulated one only has the slip kept in this browser.
 */
export function proofHref(p: Payment): string {
  // the public link carries the signed id; an order id alone opens nothing
  const live = p.settlement?.mode === 'testnet' ? p.settlement.liveProofId : undefined
  return live ? `/proof/${encodeURIComponent(live)}` : `/app/proof/${p.id}`
}
