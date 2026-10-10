// The numbers of the Reports page, as pure functions over the demo state. A period is whole calendar months (UTC)
// back from now; a network filter narrows everything to Tempo or Solana. Every figure is computed from the
// payments and the activity log; nothing here is invented.
import type { Activity, DemoState, Network, Payment } from './types.ts'

export type PeriodKey = 'month' | 'q' | 'year' | 'all'
export type NetworkFilter = 'all' | Network

const MONTHS: Record<Exclude<PeriodKey, 'all'>, number> = { month: 1, q: 3, year: 12 }
const HOUR = 3_600_000

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const monthKey = (d: Date) => d.toISOString().slice(0, 7)
const monthStart = (nowMs: number, back: number) => {
  const now = new Date(nowMs)
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))
}

/** The months a period covers, oldest first, as YYYY-MM. "All" starts at the first paid month (at most 24 back). */
export function monthsOf(state: DemoState, period: PeriodKey, nowMs: number): string[] {
  let count: number
  if (period === 'all') {
    const first = state.payments
      .map((p) => p.settlement?.paidAt)
      .filter((x): x is string => !!x)
      .sort()[0]
    const now = new Date(nowMs)
    const f = first ? new Date(first) : now
    count = Math.min(24, Math.max(1, (now.getUTCFullYear() - f.getUTCFullYear()) * 12 + now.getUTCMonth() - f.getUTCMonth() + 1))
  } else count = MONTHS[period]
  return Array.from({ length: count }, (_, i) => monthKey(monthStart(nowMs, count - 1 - i)))
}

const onNetwork = (p: Payment, network: NetworkFilter) => network === 'all' || p.network === network

/** Paid payments whose transfer falls in the given months, on the chosen network. */
export function paidInMonths(state: DemoState, months: string[], network: NetworkFilter): Payment[] {
  const set = new Set(months)
  return state.payments.filter((p) => p.settlement && set.has(p.settlement.paidAt.slice(0, 7)) && onNetwork(p, network))
}

/** The same number of months right before the period (empty for "all"), for the change against it. */
export function previousMonths(months: string[], period: PeriodKey): string[] {
  if (period === 'all' || months.length === 0) return []
  const [y, m] = months[0].split('-').map(Number)
  return Array.from({ length: months.length }, (_, i) => monthKey(new Date(Date.UTC(y, m - 1 - months.length + i, 1))))
}

export interface MonthStack {
  month: string
  tempo: number
  solana: number
  bank: number
  fee: number
  count: number
}

/** Per month: amount paid on each network, the estimated bank cost and the Seamoney fee. */
export function monthStacks(paid: Payment[], months: string[]): MonthStack[] {
  return months.map((month) => {
    const ps = paid.filter((p) => p.settlement!.paidAt.startsWith(month))
    return {
      month,
      tempo: sum(ps.filter((p) => p.network === 'tempo').map((p) => p.quote.amountCents)),
      solana: sum(ps.filter((p) => p.network === 'solana').map((p) => p.quote.amountCents)),
      bank: sum(ps.map((p) => p.quote.bankCostCents)),
      fee: sum(ps.map((p) => p.quote.feeCents)),
      count: ps.length,
    }
  })
}

/** The estimated saving (bank cost minus fee) added up month after month. */
export const cumulativeSaving = (stacks: MonthStack[]) => {
  let running = 0
  return stacks.map((s) => ({ month: s.month, cents: (running += s.bank - s.fee) }))
}

export interface SupplierShare {
  supplierId: string
  name: string
  cents: number
  count: number
  share: number
}

/** Who received the money, largest first, with each one's share of the total. */
export function supplierShares(state: DemoState, paid: Payment[]): SupplierShare[] {
  const total = sum(paid.map((p) => p.quote.amountCents))
  const rows = new Map<string, SupplierShare>()
  for (const p of paid) {
    const s = state.suppliers.find((x) => x.id === p.supplierId)
    const row = rows.get(p.supplierId) ?? { supplierId: p.supplierId, name: s?.name ?? p.supplierId, cents: 0, count: 0, share: 0 }
    row.cents += p.quote.amountCents
    row.count += 1
    rows.set(p.supplierId, row)
  }
  return [...rows.values()].map((r) => ({ ...r, share: total ? r.cents / total : 0 })).sort((a, b) => b.cents - a.cents)
}

/** The value at a fraction of a sorted list (nearest rank). Null for an empty list. */
export function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]
}

/** Hours from the approval request to the human approval, for payments created in the months (automatic ones skipped). */
export function approvalHours(activity: Activity[], payments: Payment[]): number[] {
  const ids = new Set(payments.map((p) => p.id))
  return activity
    .filter((a) => a.type === 'approval_requested' && a.paymentId && ids.has(a.paymentId))
    .flatMap((r) => {
      const done = activity.filter((a) => a.type === 'approved' && a.paymentId === r.paymentId && a.at >= r.at).sort((a, b) => a.at.localeCompare(b.at))[0]
      return done ? [(Date.parse(done.at) - Date.parse(r.at)) / HOUR] : []
    })
}

/** How the process ran for the payments created in the months: approvals, confirmations, reconciliation, stops. */
export function processStats(state: DemoState, months: string[], network: NetworkFilter, paid: Payment[]) {
  const set = new Set(months)
  const created = state.payments.filter((p) => set.has(p.createdAt.slice(0, 7)) && onNetwork(p, network))
  const hours = approvalHours(state.activity, created)
  const confirm = paid.map((p) => p.settlement!.confirmMs)
  const reconciled = paid.filter((p) => p.status === 'reconciled').length
  return {
    approvalMedianH: quantile(hours, 0.5),
    approvalP90H: quantile(hours, 0.9),
    approvals: hours.length,
    autoApproved: created.filter((p) => p.approval?.auto).length,
    confirmMedianMs: quantile(confirm, 0.5),
    reconciledShare: paid.length ? reconciled / paid.length : null,
    reviews: paid.filter((p) => p.status === 'in_review').length,
    rejected: created.filter((p) => p.status === 'rejected').length,
    cancelled: created.filter((p) => p.status === 'cancelled').length,
  }
}

export const total = (ps: Payment[], f: (p: Payment) => number) => sum(ps.map(f))
