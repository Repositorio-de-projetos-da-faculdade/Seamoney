// Read-only figures for the home page: the month change, approval speed, where the money goes, due dates, controls
// and the latest settlement. Every function takes `nowMs`, so the caller reads the clock once.
import { approvalIsStale } from './rules.ts'
import { OPEN } from './selectors.ts'
import type { DemoState, Network, Payment, Supplier, Wallet } from './types.ts'

const HOUR = 3_600_000
const DAY = 86_400_000
const NINETY_DAYS = 90 * DAY

/** Orders that still have to be paid: the open ones plus those a person has to look at. */
const UNPAID: readonly Payment['status'][] = [...OPEN, 'in_review']

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** The UTC month `back` months before `nowMs`, as YYYY-MM (same convention as selectors.ts). */
const monthOf = (nowMs: number, back = 0) => {
  const d = new Date(nowMs)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1)).toISOString().slice(0, 7)
}

const paidIn = (state: DemoState, month: string) => state.payments.filter((p) => p.settlement?.paidAt.startsWith(month))
const paidSince = (state: DemoState, sinceMs: number) =>
  state.payments.filter((p) => p.settlement && Date.parse(p.settlement.paidAt) >= sinceMs)

/** Paid this month and last month, in cents. The ledger shows the difference as the change. */
export function monthPair(state: DemoState, nowMs: number) {
  const month = monthOf(nowMs)
  const prevMonth = monthOf(nowMs, 1)
  return {
    month,
    prevMonth,
    cents: sum(paidIn(state, month).map((p) => p.quote.amountCents)),
    prevCents: sum(paidIn(state, prevMonth).map((p) => p.quote.amountCents)),
  }
}

/**
 * Average hours from "approval requested" to the human approval of the same payment, over the last 90 days. Automatic
 * approvals never ask anyone, so they are not part of the average. Null when nothing was approved in that window.
 */
export function approvalHours(state: DemoState, nowMs: number): number | null {
  const since = nowMs - NINETY_DAYS
  const requests = state.activity.filter((a) => a.type === 'approval_requested' && a.paymentId && Date.parse(a.at) >= since)
  const approvals = state.activity.filter((a) => a.type === 'approved' && a.paymentId)
  const hours = requests.flatMap((r) => {
    const done = approvals
      .filter((a) => a.paymentId === r.paymentId && a.at >= r.at)
      .sort((a, b) => a.at.localeCompare(b.at))[0]
    return done ? [(Date.parse(done.at) - Date.parse(r.at)) / HOUR] : []
  })
  return hours.length ? sum(hours) / hours.length : null
}

/** Paid in the last 90 days: the top suppliers by amount, and the total they are a share of. */
export function topSuppliers(state: DemoState, nowMs: number, n = 5) {
  const recent = paidSince(state, nowMs - NINETY_DAYS)
  const totals = new Map<string, { supplier: Supplier; cents: number; count: number }>()
  for (const p of recent) {
    const supplier = state.suppliers.find((s) => s.id === p.supplierId)
    if (!supplier) continue
    const row = totals.get(supplier.id) ?? { supplier, cents: 0, count: 0 }
    row.cents += p.quote.amountCents
    row.count += 1
    totals.set(supplier.id, row)
  }
  const rows = [...totals.values()].sort((a, b) => b.cents - a.cents).slice(0, n)
  return { rows, totalCents: sum(recent.map((p) => p.quote.amountCents)) }
}

/** Paid in the last 90 days, per settlement network. */
export function networkSplit(state: DemoState, nowMs: number): Record<Network, { cents: number; count: number }> {
  const paid = paidSince(state, nowMs - NINETY_DAYS)
  const of = (network: Network) => {
    const mine = paid.filter((p) => p.network === network)
    return { cents: sum(mine.map((p) => p.quote.amountCents)), count: mine.length }
  }
  return { tempo: of('tempo'), solana: of('solana') }
}

export interface DueItem {
  payment: Payment
  /** Days from today: negative when overdue, 0 when due today. */
  days: number
}

/**
 * Unpaid orders with a due date, soonest first. `strip` sums their amounts (cents) per day for the next `windowDays`
 * days (today is index 0); `overdue` and `upcoming` (the next three) are the lines under it.
 */
export function dueSoon(state: DemoState, nowMs: number, windowDays = 14) {
  const today = Math.floor(nowMs / DAY) * DAY
  const items: DueItem[] = state.payments
    .filter((p) => p.dueDate && UNPAID.includes(p.status))
    .map((payment) => ({ payment, days: Math.round((Date.parse(payment.dueDate!.slice(0, 10)) - today) / DAY) }))
    .filter((i) => Number.isFinite(i.days))
    .sort((a, b) => a.days - b.days)
  const strip = Array.from({ length: windowDays + 1 }, (_, day) =>
    sum(items.filter((i) => i.days === day).map((i) => i.payment.quote.amountCents)),
  )
  return {
    overdue: items.filter((i) => i.days < 0),
    upcoming: items.filter((i) => i.days >= 0).slice(0, 3),
    strip,
  }
}

/** What needs a decision from an owner or approver beyond the day's tasks. */
export function controls(state: DemoState) {
  return {
    inReview: state.payments.filter((p) => p.status === 'in_review'),
    walletsAwaiting: state.suppliers.flatMap((supplier) =>
      supplier.wallets.filter((w: Wallet) => w.status === 'proposed').map((wallet) => ({ supplier, wallet })),
    ),
    stale: state.payments.filter((p) => approvalIsStale(state, p)),
  }
}

/** The newest payment that reconciled (all five checks), for the receipt on the home page. Review cases stay out. */
export function latestSettlement(state: DemoState): Payment | null {
  const reconciled = state.payments.filter((p) => p.status === 'reconciled' && p.settlement && p.recon)
  return reconciled.sort((a, b) => b.settlement!.paidAt.localeCompare(a.settlement!.paidAt))[0] ?? null
}
