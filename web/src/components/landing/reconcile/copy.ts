import { encodeMemo, memoHex } from '@/lib/memo'
import { dateShort, usd, type Locale } from '@/lib/format'
import type { T } from '@/lib/i18n/server'

// Everything the chapter shows, already translated. The invoice, event and CSV are sample data (and labelled so).

const INVOICE_NO = 'INV-2026-0845'
const SUPPLIER = 'Shenzhen Tech Co.'

export interface ReconcileCopy {
  chapter: string
  title: string
  body: string
  stamp: string
  proof: string
  csv: string
  sample: string
  invoiceLabel: string
  eventLabel: string
  fields: { label: string; value: string; mark?: boolean }[]
  total: { label: string; value: string }
  checks: string[]
  event: { key: string; value: string; tone?: 'mint' | 'dim' }[]
  csvLines: [string, string]
  invoiceNo: string
  supplier: string
}

export function reconcileCopy(t: T, locale: Locale): ReconcileCopy {
  const hex = memoHex(encodeMemo(INVOICE_NO))
  return {
    chapter: t('lp.ch.4'),
    title: t('lp.recon.title'),
    body: t('lp.recon.body'),
    stamp: t('lp.recon.stamp'),
    proof: t('lp.recon.proof'),
    csv: t('lp.recon.csv'),
    sample: t('story.sample'),
    invoiceLabel: t('lp.recon.invoice'),
    eventLabel: t('lp.recon.event'),
    fields: [
      { label: t('wiz.review.supplier'), value: SUPPLIER },
      { label: t('wiz.review.invoice'), value: INVOICE_NO, mark: true },
      { label: t('wiz.review.due'), value: dateShort('2026-10-25', locale) },
    ],
    total: { label: t('wiz.review.amount'), value: usd(8_000_000, locale) },
    checks: [t('od.recon.token'), t('od.recon.recipient'), t('od.recon.amount'), t('od.recon.memo'), t('od.recon.receipt')],
    event: [
      { key: 'event', value: 'TransferWithMemo', tone: 'mint' },
      { key: 'token', value: 'AlphaUSD' },
      { key: 'to', value: '0x75c0…7ff0' },
      { key: 'amount', value: '80,000.000000' },
      { key: 'memo', value: `${hex.slice(0, 28)}…`, tone: 'dim' },
      { key: '→', value: INVOICE_NO, tone: 'mint' },
    ],
    csvLines: ['payment_reference_memo,supplier,amount_usd,status', `${INVOICE_NO},${SUPPLIER},80000.00,reconciled`],
    invoiceNo: INVOICE_NO,
    supplier: SUPPLIER,
  }
}
