// Pure helpers for the Reports page: period comparison, month rows, audit grouping and the audit CSV. No React.
import type { ActivityType, Payment } from './types'

export type ActivityKind = 'all' | 'payments' | 'suppliers' | 'team'

/** Which activity types each filter in the audit trail keeps. */
export const AUDIT_GROUP: Record<Exclude<ActivityKind, 'all'>, readonly ActivityType[]> = {
  payments: [
    'payment_created',
    'approval_requested',
    'auto_approved',
    'approved',
    'rejected',
    'cancelled',
    'payment_started',
    'payment_sent',
    'payment_failed',
    'reconciled',
    'review_opened',
  ],
  suppliers: ['supplier_added', 'supplier_updated', 'wallet_proposed', 'wallet_approved', 'wallet_rejected'],
  team: ['member_invited', 'role_changed', 'settings_changed'],
}

/** Percent change from prev to cur, rounded to a whole number; null when there is nothing to compare with. */
export function changePct(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((cur - prev) / prev) * 100)
}

/** The last `months` calendar months as YYYY-MM (UTC), oldest first, ending with the month of nowMs. */
export function monthKeys(nowMs: number, months: number): string[] {
  const now = new Date(nowMs)
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

export interface MonthRow {
  month: string
  count: number
  amountCents: number
  feeCents: number
  /** total USD: the amount plus the Seamoney fee */
  totalCents: number
  /** estimate */
  bankCents: number
  /** estimate */
  savingsCents: number
  brlCents: number
}

function totalsOf(month: string, xs: Payment[]): MonthRow {
  const s = (f: (p: Payment) => number) => xs.reduce((a, p) => a + f(p), 0)
  const amountCents = s((p) => p.quote.amountCents)
  const feeCents = s((p) => p.quote.feeCents)
  return {
    month,
    count: xs.length,
    amountCents,
    feeCents,
    totalCents: amountCents + feeCents,
    bankCents: s((p) => p.quote.bankCostCents),
    savingsCents: s((p) => p.quote.savingsCents),
    brlCents: s((p) => p.quote.totalBrlCents),
  }
}

/** One row per month of the window, grouped by the month each payment was sent (UTC). */
export function monthRows(paid: Payment[], nowMs: number, months: number): MonthRow[] {
  return monthKeys(nowMs, months).map((month) => totalsOf(month, paid.filter((p) => p.settlement?.paidAt.startsWith(month))))
}

/** Sum of several month rows, for a totals line. */
export function totalOf(rows: MonthRow[]): MonthRow {
  return rows.reduce((acc, r) => ({
    month: '',
    count: acc.count + r.count,
    amountCents: acc.amountCents + r.amountCents,
    feeCents: acc.feeCents + r.feeCents,
    totalCents: acc.totalCents + r.totalCents,
    bankCents: acc.bankCents + r.bankCents,
    savingsCents: acc.savingsCents + r.savingsCents,
    brlCents: acc.brlCents + r.brlCents,
  }), totalsOf('', []))
}

/** The UTC calendar day of an ISO instant, YYYY-MM-DD. */
export const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10)

/** One CSV cell: quoted when needed, and text that a spreadsheet could read as a formula is prefixed with an apostrophe. */
function cell(value: string) {
  const v = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** The audit trail as CSV: a header line, then one line per entry. */
export function auditCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n'
}
