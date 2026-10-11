'use client'

import { activeWallet } from '@/lib/demo/rules'
import { NETWORKS, type InvoiceSource, type Network, type Supplier } from '@/lib/demo/types'

export interface Draft {
  supplierId: string
  network: Network | ''
  /** the name printed on the invoice, used to match a supplier */
  printedName: string
  printedCountry: string
  invoiceNumber: string
  amount: string
  currency: string
  dueDate: string
  source: InvoiceSource
  filename: string
  /** the person confirmed the fields against the invoice (required when the AI read them) */
  reviewed: boolean
}

export const EMPTY_DRAFT: Draft = {
  supplierId: '',
  network: '',
  printedName: '',
  printedCountry: '',
  invoiceNumber: '',
  amount: '',
  currency: 'USD',
  dueDate: '',
  source: 'manual',
  filename: '',
  reviewed: false,
}

/** The network a supplier receives on when it has exactly one approved wallet; with two, the choice stays open. */
export function autoNetwork(supplier: Supplier): Network | '' {
  const approved = NETWORKS.filter((n) => activeWallet(supplier, n))
  return approved.length === 1 ? approved[0] : ''
}

/** A manual order that starts with a supplier already chosen (from the suppliers list or the ?supplier= link). */
export function supplierDraft(suppliers: Supplier[], supplierId: string): Draft {
  const s = suppliers.find((x) => x.id === supplierId)
  return { ...EMPTY_DRAFT, supplierId: s?.id ?? '', network: s ? autoNetwork(s) : '' }
}

export interface Extracted {
  supplier_name: string
  supplier_country: string
  invoice_number: string
  total_amount: number | null
  currency: string
  due_date: string
}

/** Finds the supplier whose name matches the one printed on the invoice (case and accents ignored). */
export function matchSupplier(suppliers: Supplier[], printed: string): Supplier | undefined {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  const target = norm(printed)
  return target ? suppliers.find((s) => norm(s.name) === target) : undefined
}

/** Warns when the due date (YYYY-MM-DD) is already past or within 3 days of `now` (a timestamp read once per mount). */
export function dueWarning(dueDate: string, now: number): 'past' | 'soon' | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate)
  if (!m) return null
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'past'
  return days <= 3 ? 'soon' : null
}
