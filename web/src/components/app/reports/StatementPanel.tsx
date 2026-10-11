'use client'

import clsx from 'clsx'
import { brl, monthLabel, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { Simulated } from '../kit/Status'
import { td, th, tr } from '../kit/styles'
import { total } from '@/lib/demo/reportData'

interface Line {
  month: string
  count: number
  amount: number
  fees: number
  total: number
  brl: number
}

/** Group the period's paid payments by calendar month (UTC), newest month first. */
function linesOf(paid: Payment[]): Line[] {
  const byMonth = new Map<string, Payment[]>()
  for (const p of paid) {
    const month = p.settlement!.paidAt.slice(0, 7)
    byMonth.set(month, [...(byMonth.get(month) ?? []), p])
  }
  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, ps]) => ({
      month,
      count: ps.length,
      amount: total(ps, (p) => p.quote.amountCents),
      fees: total(ps, (p) => p.quote.feeCents),
      total: total(ps, (p) => p.quote.totalCents),
      brl: total(ps, (p) => p.quote.totalBrlCents),
    }))
}

/** The accountant's statement: one line per month, with a totals line, in dollars and in (simulated) reais. */
export function StatementPanel({ paid }: { paid: Payment[] }) {
  const { t, locale } = useT()
  const lines = linesOf(paid)
  const totals = lines.reduce(
    (a, l) => ({ count: a.count + l.count, amount: a.amount + l.amount, fees: a.fees + l.fees, total: a.total + l.total, brl: a.brl + l.brl }),
    { count: 0, amount: 0, fees: 0, total: 0, brl: 0 },
  )
  const num = 'text-right tabular-nums'
  return (
    <Panel aria-labelledby="rep-statement">
      <PanelHead id="rep-statement" title={t('app.rep.statement')} meta={t('app.rep.statement.meta')} />
      {lines.length === 0 ? (
        <Empty title={t('app.rep.empty')}>{t('app.rep.empty.body')}</Empty>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead className="border-b border-rule">
              <tr>
                <th scope="col" className={clsx(th, 'pl-5')}>
                  {t('app.rep.col.month')}
                </th>
                <th scope="col" className={clsx(th, num)}>
                  {t('app.rep.col.payments')}
                </th>
                <th scope="col" className={clsx(th, num)}>
                  {t('app.rep.col.amount')}
                </th>
                <th scope="col" className={clsx(th, num)}>
                  {t('app.rep.col.fees')}
                </th>
                <th scope="col" className={clsx(th, num)}>
                  {t('app.rep.col.total')}
                </th>
                <th scope="col" className={clsx(th, num, 'pr-5')}>
                  <span className="inline-flex items-center gap-2">
                    {t('app.rep.col.brl')}
                    <Simulated>{''}</Simulated>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.month} className={tr}>
                  <th scope="row" className={clsx(td, 'pl-5 font-normal capitalize text-ink')}>
                    {monthLabel(l.month, locale)} {l.month.slice(0, 4)}
                  </th>
                  <td className={clsx(td, num)}>{l.count}</td>
                  <td className={clsx(td, num)}>{usd(l.amount, locale)}</td>
                  <td className={clsx(td, num, 'text-muted')}>{usd(l.fees, locale)}</td>
                  <td className={clsx(td, num)}>{usd(l.total, locale)}</td>
                  <td className={clsx(td, num, 'pr-5 text-muted')}>{brl(l.brl, locale)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-ink/70 font-medium">
              <tr>
                <th scope="row" className={clsx(td, 'pl-5 text-ink')}>
                  {t('app.rep.statement.total')}
                </th>
                <td className={clsx(td, num)}>{totals.count}</td>
                <td className={clsx(td, num)}>{usd(totals.amount, locale)}</td>
                <td className={clsx(td, num)}>{usd(totals.fees, locale)}</td>
                <td className={clsx(td, num)}>{usd(totals.total, locale)}</td>
                <td className={clsx(td, num, 'pr-5')}>{brl(totals.brl, locale)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Panel>
  )
}
