'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { dateShort, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { dueSoon } from '@/lib/demo/insights'
import { supplierOf } from '@/lib/demo/selectors'
import type { DemoState } from '@/lib/demo/types'
import { Empty, Note, Panel, PanelHead } from '../kit/Panel'
import { figure, label, textLink } from '../kit/styles'

const DAY = 86_400_000
const WINDOW = 30

/** Unpaid orders due in the next 30 days: overdue in a note, one bar per day (weekends dimmer), then the next three by name. */
export function DueSoon({ state, now }: { state: DemoState; now: number }) {
  const { t, locale } = useT()
  const due = dueSoon(state, now, WINDOW)
  const dayOf = (offset: number) => new Date(now + offset * DAY)
  const weekend = (offset: number) => [0, 6].includes(dayOf(offset).getDay())
  const max = Math.max(1, ...due.strip)
  const overdueCents = due.overdue.reduce((sum, i) => sum + i.payment.quote.amountCents, 0)
  const when = (days: number) =>
    days === 0 ? t('app.home.due.today') : days < 0 ? t('app.home.due.late', { n: -days }) : t('app.home.due.in', { n: days })

  return (
    <Panel aria-labelledby="home-due">
      <PanelHead id="home-due" title={t('app.home.due')} />
      <p className="px-5 pb-4 text-[13px] text-muted">{t('app.home.dueMeta')}</p>
      {due.overdue.length + due.upcoming.length === 0 ? (
        <Empty title={t('app.home.due.none')} />
      ) : (
        <div className="space-y-4 px-5 pb-5">
          {due.overdue.length > 0 && (
            <Note tone="bad">{t('app.home.due.overdue', { n: due.overdue.length, amount: usd(overdueCents, locale) })}</Note>
          )}
          <div aria-hidden="true">
            <div className="flex h-20 items-end gap-[2px] border-b border-ink/25">
              {due.strip.map((cents, day) => (
                <span
                  key={day}
                  className={clsx('flex-1', cents ? (weekend(day) ? 'bg-brand-600/45' : 'bg-brand-600') : weekend(day) ? 'bg-ink/[0.03]' : 'bg-transparent', day === 0 && 'outline outline-1 outline-mint')}
                  style={{ height: cents ? `${Math.max(4, (cents / max) * 100)}%` : '100%' }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-data text-[10px] uppercase tracking-[0.06em] text-muted">
              <span>{t('app.home.due.axisToday')}</span>
              <span>{dateShort(dayOf(WINDOW / 2).toISOString(), locale)}</span>
              <span>{dateShort(dayOf(WINDOW).toISOString(), locale)}</span>
            </div>
          </div>
          <div className="sr-only">
            <table>
              <caption>{t('app.home.due.table')}</caption>
              <tbody>
                {due.strip.map((cents, day) => (
                  <tr key={day}>
                    <th scope="row">{dateShort(new Date(now + day * DAY).toISOString(), locale)}</th>
                    <td>{usd(cents, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-hair">
            {due.upcoming.map(({ payment, days }) => (
              <li key={payment.id}>
                <Link href={`/app/payments/${payment.id}`} className="group flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className={`${label} block`}>{when(days)}</span>
                    <span className="block truncate text-[14px] text-ink group-hover:underline">
                      {supplierOf(state, payment)?.name ?? ''}, {payment.invoiceNumber}
                    </span>
                  </span>
                  <span className={`${figure} shrink-0 text-[16px] text-ink`}>{usd(payment.quote.amountCents, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/app/payments?view=ready" className={`${textLink} text-[13.5px]`}>
            {t('app.viewAll')}
          </Link>
        </div>
      )}
    </Panel>
  )
}
