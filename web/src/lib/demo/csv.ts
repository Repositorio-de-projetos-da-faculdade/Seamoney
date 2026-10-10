// Accountant export of the demo payments, built in the browser. Money columns are plain decimals so spreadsheets
// can sum them; the BRL column says it is simulated.
import { memberOf, supplierOf, walletOf } from './selectors'
import type { DemoState, Payment } from './types'

const HEADER = [
  'payment_id',
  'reference_memo',
  'invoice_number',
  'supplier',
  'supplier_country',
  'network',
  'supplier_wallet',
  'wallet_version',
  'amount_usd',
  'fee_usd',
  'total_usd',
  'total_brl_simulated',
  'fx_rate_simulated',
  'status',
  'created_by',
  'created_at',
  'approved_by',
  'approved_at',
  'settlement',
  'tx_hash',
  'block_or_slot',
  'paid_at',
  'reconciled_at',
]

const money = (cents: number) => (cents / 100).toFixed(2)

function cell(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value)
  // quote anything a spreadsheet could misread, and neutralise formula prefixes
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n]/.test(safe) || safe !== s ? `"${safe.replaceAll('"', '""')}"` : safe
}

function row(state: DemoState, p: Payment) {
  const supplier = supplierOf(state, p)
  const wallet = walletOf(state, p)
  const approver = p.approval?.auto ? 'policy' : memberOf(state, p.approval?.by)?.name
  return [
    p.id,
    p.reference,
    p.invoiceNumber,
    supplier?.name,
    supplier?.country,
    p.network,
    wallet?.address,
    wallet?.version,
    money(p.quote.amountCents),
    money(p.quote.feeCents),
    money(p.quote.totalCents),
    money(p.quote.totalBrlCents),
    p.quote.fxRate.toFixed(4),
    p.status,
    memberOf(state, p.createdBy)?.name,
    p.createdAt,
    approver,
    p.approval?.at,
    p.settlement?.mode,
    p.settlement?.txHash,
    p.settlement?.blockNumber,
    p.settlement?.paidAt,
    p.status === 'reconciled' ? p.recon?.matchedAt : null,
  ]
    .map(cell)
    .join(',')
}

export function paymentsCsv(state: DemoState, payments: Payment[]) {
  return [HEADER.join(','), ...payments.map((p) => row(state, p))].join('\n') + '\n'
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  // BOM so Excel opens accents correctly
  const blob = new Blob(['﻿', text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
