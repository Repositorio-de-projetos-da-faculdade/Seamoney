'use client'

import Link from 'next/link'
import { brl, dateShort, dateTime, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { memberOf, supplierOf, walletOf } from '@/lib/demo/selectors'
import type { DemoState, Payment } from '@/lib/demo/types'
import { Facts, type Row } from '../../kit/Fields'
import { Panel, PanelHead } from '../../kit/Panel'
import { NetworkTag, Simulated } from '../../kit/Status'
import { code, figure, textLink } from '../../kit/styles'
import { CopyButton } from './CopyButton'
import { InvoiceThumb } from './InvoiceThumb'

/** What is being paid: the invoice, who it is from, and where its data came from. */
export function InvoicePanel({ state, payment: p }: { state: DemoState; payment: Payment }) {
  const { t, locale } = useT()
  const supplier = supplierOf(state, p)
  const creator = memberOf(state, p.createdBy)?.name ?? ''
  const source =
    p.source === 'ai'
      ? t('app.doc.source.ai', { file: p.invoiceFilename ?? '', who: creator })
      : p.source === 'demo'
        ? t('app.doc.source.demo', { who: creator })
        : t('app.doc.source.manual', { who: creator })
  const rows: Row[] = [
    {
      label: t('app.doc.f.supplier'),
      value: supplier ? (
        <Link href={`/app/suppliers/${supplier.id}`} className={textLink}>
          {supplier.name}
        </Link>
      ) : null,
      note: supplier ? `${supplier.city}, ${supplier.country}` : null,
    },
    { label: t('app.doc.f.invoice'), value: <span className={code}>{p.invoiceNumber}</span> },
    { label: t('app.doc.f.due'), value: dateShort(p.dueDate, locale) },
    { label: t('app.doc.f.source'), value: source },
    { label: t('app.doc.f.created'), value: dateTime(p.createdAt, locale), note: creator },
  ]
  return (
    <Panel aria-labelledby="doc-invoice">
      <PanelHead id="doc-invoice" title={t('app.doc.invoice')} />
      <div className="grid md:grid-cols-[minmax(0,1fr)_auto]">
        <Facts rows={rows} />
        <div className="border-hair px-5 py-5 max-md:border-t md:border-l print:hidden">
          <InvoiceThumb payment={p} supplier={supplier} />
        </div>
      </div>
    </Panel>
  )
}

/** The money: what the supplier gets, what Seamoney charges, the reais side (simulated) and the bank comparison. */
export function AmountsPanel({ payment: p }: { payment: Payment }) {
  const { t, locale } = useT()
  const q = p.quote
  const rows: Row[] = [
    { label: t('app.doc.f.amount'), value: <span className="tabular-nums">{usd(q.amountCents, locale)}</span>, note: t('app.doc.f.amountNote') },
    { label: t('app.doc.f.fee', { pct: (q.feeBps / 100).toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US') }), value: <span className="tabular-nums">{usd(q.feeCents, locale)}</span> },
    { label: t('app.doc.f.total'), value: <span className={`${figure} text-[22px]`}>{usd(q.totalCents, locale)}</span>, total: true },
    {
      label: t('app.doc.f.brl'),
      value: (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tabular-nums">{brl(q.totalBrlCents, locale)}</span>
          <Simulated />
        </span>
      ),
      note: t('app.doc.f.brlNote', { rate: q.fxRate.toFixed(2) }),
    },
    {
      label: t('app.doc.f.savings'),
      value: <span className="tabular-nums text-ok-ink">{usd(q.savingsCents, locale)}</span>,
      note: t('app.doc.f.savingsNote', { pct: q.bankFeePct, bank: usd(q.bankCostCents, locale) }),
    },
  ]
  return (
    <Panel aria-labelledby="doc-amounts">
      <PanelHead id="doc-amounts" title={t('app.doc.amounts')} />
      <Facts rows={rows} />
    </Panel>
  )
}

/** Where the money goes: network, token, the approved wallet version and the reference written as memo. */
export function DestinationPanel({ state, payment: p }: { state: DemoState; payment: Payment }) {
  const { t, locale } = useT()
  const wallet = walletOf(state, p)
  const approver = memberOf(state, wallet?.approvedBy)?.name
  const rows: Row[] = [
    { label: t('app.doc.f.network'), value: <NetworkTag network={p.network} />, note: t(`app.net.${p.network}.long`) },
    { label: t('app.doc.f.token'), value: t(`app.net.${p.network}.token`) },
    {
      label: t('app.doc.f.wallet'),
      value: wallet ? (
        <span className="flex items-start gap-2">
          <span className={`${code} min-w-0 break-all`}>{wallet.address}</span>
          <CopyButton value={wallet.address} what={t('app.doc.f.wallet')} />
        </span>
      ) : (
        <span className="text-bad-ink">{t('app.err.no_wallet')}</span>
      ),
      note: wallet ? t('app.doc.f.walletNote', { version: wallet.version, who: approver ?? '', date: dateShort(wallet.approvedAt, locale) }) : null,
    },
    {
      label: t('app.doc.f.memo'),
      value: (
        <span className="flex items-center gap-2">
          <span className={`${code} rounded-[2px] bg-mint/30 px-1.5 py-0.5`}>{p.reference}</span>
          <CopyButton value={p.reference} what={t('app.doc.f.memo')} />
        </span>
      ),
      note: t('app.doc.f.memoNote'),
    },
  ]
  return (
    <Panel aria-labelledby="doc-dest">
      <PanelHead id="doc-dest" title={t('app.doc.destination')} />
      <Facts rows={rows} />
    </Panel>
  )
}
