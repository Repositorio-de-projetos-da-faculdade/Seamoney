import type { Locale } from '@/lib/format'
import type { DemoState, Network, Supplier } from '@/lib/demo/types'
import { supplierTotals } from '@/lib/demo/selectors'
import { activeWallet } from '@/lib/demo/rules'
import { countryName, proposedWallets } from './helpers'

const DAY = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 90
const MONTHS = 6

export type SortKey = 'paid' | 'last' | 'name'
export interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}
export type NetworkFilter = 'all' | Network

/** One line of the supplier list, with every figure the table and the phone list show. */
export interface SupplierRow {
  supplier: Supplier
  /** Paid to date, all time (cents). */
  paidCents: number
  lastPaidAt: string | null
  open: number
  /** Paid in the last 90 days (cents). */
  paid90: number
  /** Paid per month over the last six months, oldest first (cents). */
  months: number[]
  /** Share of the 90-day spend of all suppliers, 0 to 1. */
  share: number
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** The last six UTC months as YYYY-MM, oldest first. */
function monthKeys(nowMs: number): string[] {
  const now = new Date(nowMs)
  return Array.from({ length: MONTHS }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1) + i, 1)).toISOString().slice(0, 7))
}

/** Figures for every supplier, computed once per render from the settled payments. */
export function buildRows(state: DemoState, nowMs: number): SupplierRow[] {
  const cutoff = nowMs - WINDOW_DAYS * DAY
  const keys = monthKeys(nowMs)
  const base = state.suppliers.map((supplier) => {
    const totals = supplierTotals(state, supplier.id)
    const paid = state.payments.filter((p) => p.supplierId === supplier.id && p.settlement)
    const at = (p: (typeof paid)[number]) => p.settlement!.paidAt
    return {
      supplier,
      paidCents: totals.paidCents,
      lastPaidAt: totals.lastPaidAt,
      open: totals.open,
      paid90: sum(paid.filter((p) => Date.parse(at(p)) >= cutoff).map((p) => p.quote.amountCents)),
      months: keys.map((k) => sum(paid.filter((p) => at(p).slice(0, 7) === k).map((p) => p.quote.amountCents))),
    }
  })
  const total90 = sum(base.map((r) => r.paid90))
  return base.map((r) => ({ ...r, share: total90 > 0 ? r.paid90 / total90 : 0 }))
}

/** Totals for the summary strip. */
export function summarize(state: DemoState, rows: SupplierRow[]) {
  return {
    suppliers: state.suppliers.length,
    paid90: sum(rows.map((r) => r.paid90)),
    open: sum(rows.map((r) => r.open)),
    waiting: sum(state.suppliers.map((s) => proposedWallets(s).length)),
  }
}

/** "Hong Kong" when the city is the country itself, "Shenzhen, China" otherwise. */
export function placeLabel(supplier: Supplier, locale: Locale): string {
  const country = countryName(supplier.country, locale)
  const city = supplier.city.trim()
  if (!city) return country
  const sameAsCountry = [country, supplier.country].some((v) => v.toLowerCase() === city.toLowerCase())
  return sameAsCountry ? country : `${city}, ${country}`
}

/** Search over name, city and country (code or name), and the network filter (a supplier with an approved wallet there). */
export function filterRows(rows: SupplierRow[], query: string, network: NetworkFilter, locale: Locale): SupplierRow[] {
  const q = query.trim().toLowerCase()
  return rows.filter(({ supplier: s }) => {
    if (network !== 'all' && !activeWallet(s, network)) return false
    if (!q) return true
    return [s.name, s.city, s.country, countryName(s.country, locale)].some((v) => v.toLowerCase().includes(q))
  })
}

/** Sorts a copy. Suppliers never paid always go last when sorting by last payment. */
export function sortRows(rows: SupplierRow[], sort: SortState, locale: Locale): SupplierRow[] {
  const mul = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (sort.key === 'name') return mul * a.supplier.name.localeCompare(b.supplier.name, locale === 'pt' ? 'pt-BR' : 'en')
    if (sort.key === 'paid') return mul * (a.paidCents - b.paidCents)
    if (!a.lastPaidAt || !b.lastPaidAt) return a.lastPaidAt ? -1 : b.lastPaidAt ? 1 : 0
    return mul * (Date.parse(a.lastPaidAt) - Date.parse(b.lastPaidAt))
  })
}

/** Clicking the active column flips its direction; a new column starts with its natural order. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: key === 'name' ? 'asc' : 'desc' }
}
