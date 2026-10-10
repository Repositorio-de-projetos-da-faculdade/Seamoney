'use client'

import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'
import { Panel } from '../../kit/Panel'
import { figure, label } from '../../kit/styles'
import { daysUntil, stillDue } from './due'

const sum = (ps: Payment[]) => ps.reduce((a, p) => a + p.quote.amountCents, 0)

/** The view in numbers, over what is on screen: how many, how much, what falls due this week, what is late. */
export function ViewSummary({ payments, now }: { payments: Payment[]; now: number }) {
  const { t, locale } = useT()
  const due = payments.filter((p) => stillDue(p))
  const week = due.filter((p) => {
    const d = daysUntil(p, now)
    return d !== null && d >= 0 && d <= 7
  })
  const late = due.filter((p) => {
    const d = daysUntil(p, now)
    return d !== null && d < 0
  })
  const cells = [
    { name: t('app.plist.sum.count'), value: String(payments.length), note: null },
    { name: t('app.plist.sum.total'), value: usd(sum(payments), locale), note: null },
    { name: t('app.plist.sum.week'), value: usd(sum(week), locale), note: t('app.plist.sum.payments', { n: week.length }) },
    ...(late.length ? [{ name: t('app.plist.sum.late'), value: usd(sum(late), locale), note: t('app.plist.sum.payments', { n: late.length }), bad: true }] : []),
  ]
  return (
    <Panel className="mb-4" as="div">
      <dl className="grid grid-cols-2 gap-px bg-hair md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
        {cells.map((c) => (
          <div key={c.name} className="min-w-0 bg-sheet px-5 py-3.5">
            <dt className={label}>{c.name}</dt>
            <dd className={`${figure} mt-1 truncate text-[22px] leading-none ${'bad' in c && c.bad ? 'text-bad-ink' : 'text-ink'}`}>{c.value}</dd>
            {c.note ? <dd className="mt-1 text-[12.5px] text-muted">{c.note}</dd> : null}
          </div>
        ))}
      </dl>
    </Panel>
  )
}
