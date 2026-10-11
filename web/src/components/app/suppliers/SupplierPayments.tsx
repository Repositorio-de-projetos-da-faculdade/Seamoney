'use client'

import Link from 'next/link'
import { dateShort, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { supplierTotals } from '@/lib/demo/selectors'
import type { DemoState, Payment, Supplier } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { NetworkTag, Status } from '../kit/Status'
import { code, figure, td, textLink, th, tr } from '../kit/styles'
import { totalCents } from './detailFormat'

/** This supplier's payments, newest first, each one a link to its page. */
export function SupplierPayments({ state, supplier }: { state: DemoState; supplier: Supplier }) {
  const { t, locale } = useT()
  const totals = supplierTotals(state, supplier.id)
  const payments: Payment[] = state.payments.filter((p) => p.supplierId === supplier.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = totalCents(payments)

  return (
    <Panel aria-labelledby="sup-payments">
      <PanelHead
        id="sup-payments"
        title={t('app.sup.pay.title')}
        meta={payments.length ? t('app.sup.pay.meta', { count: totals.count, paid: usd(totals.paidCents, locale), open: totals.open }) : undefined}
      />
      {payments.length === 0 ? (
        <Empty title={t('app.sup.pay.empty.title')}>{t('app.sup.pay.empty.body')}</Empty>
      ) : (
        <>
          <div className="relative overflow-x-auto max-md:hidden">
            <table className="w-full min-w-[620px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-rule">
                  <th className={th}>{t('app.sup.pay.invoice')}</th>
                  <th className={`${th} text-right`}>{t('app.sup.pay.amount')}</th>
                  <th className={th}>{t('app.sup.pay.network')}</th>
                  <th className={th}>{t('app.sup.pay.status')}</th>
                  <th className={th}>{t('app.sup.pay.date')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className={tr}>
                    <td className={td}>
                      <Link href={`/app/payments/${p.id}`} className={`${code} ${textLink}`}>
                        {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className={`${td} text-right`}>
                      <span className={`${figure} text-[16px]`}>{usd(p.quote.amountCents, locale)}</span>
                    </td>
                    <td className={td}>
                      <NetworkTag network={p.network} />
                    </td>
                    <td className={td}>
                      <Status status={p.status} />
                    </td>
                    <td className={`${td} text-muted`}>{dateShort(p.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-rule">
                  <td className={`${td} text-muted`}>{t('app.sdoc.pay.total', { count: payments.length })}</td>
                  <td className={`${td} text-right`}>
                    <span className={`${figure} text-[16px]`}>{usd(total, locale)}</span>
                  </td>
                  <td className={td} colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
          <ul className="divide-y divide-hair md:hidden">
            {payments.map((p) => (
              <li key={p.id}>
                <Link href={`/app/payments/${p.id}`} className="block px-5 py-3.5 hover:bg-paper-hi">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={`${code} min-w-0 break-all text-ink`}>{p.invoiceNumber}</span>
                    <span className={`${figure} shrink-0 text-[16px]`}>{usd(p.quote.amountCents, locale)}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <Status status={p.status} />
                    <span className="flex items-center gap-3 text-[13px] text-muted">
                      <NetworkTag network={p.network} />
                      {dateShort(p.createdAt, locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="flex items-baseline justify-between gap-3 border-t border-rule px-5 py-3.5 text-[13px] text-muted md:hidden">
            {t('app.sdoc.pay.total', { count: payments.length })}
            <span className={`${figure} text-[16px] text-ink`}>{usd(total, locale)}</span>
          </p>
        </>
      )}
    </Panel>
  )
}
