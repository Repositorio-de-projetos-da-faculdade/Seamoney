'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { relative, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { supplierOf, tasksFor, waitingOnOthers, type Task } from '@/lib/demo/selectors'
import type { DemoState, Member, Payment } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { NetworkTag } from '../kit/Status'
import { figure, textLink } from '../kit/styles'

const LIMIT = 6

/** The payments this person sent that wait for someone else, so the empty state can still point somewhere. */
function WaitingList({ state, payments }: { state: DemoState; payments: Payment[] }) {
  const { locale } = useT()
  return (
    <ul className="divide-y divide-hair border-t border-hair">
      {payments.map((p) => (
        <li key={p.id}>
          <Link
            href={`/app/payments/${p.id}`}
            className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-paper-hi"
          >
            <span className="min-w-0 truncate text-[14px] text-ink">
              {supplierOf(state, p)?.name ?? ''}, {p.invoiceNumber}
            </span>
            <span className={`${figure} shrink-0 text-[16px] text-ink`}>{usd(p.quote.amountCents, locale)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** What waits for this person, oldest first: one line per decision, with where to make it. */
export function YourTurn({ state, me, now }: { state: DemoState; me: Member; now: number }) {
  const { t, locale } = useT()
  const tasks = tasksFor(state, me)
  const waiting = waitingOnOthers(state, me)

  const row = (task: Task) => {
    if (task.kind === 'wallet') {
      const { supplier, wallet } = task
      return {
        key: wallet.id,
        href: `/app/suppliers/${supplier.id}`,
        verb: t('app.home.task.wallet'),
        what: supplier.name,
        side: <NetworkTag network={wallet.network} />,
        when: wallet.proposedAt,
      }
    }
    const p = task.payment
    return {
      key: `${task.kind}-${p.id}`,
      href: `/app/payments/${p.id}`,
      verb: t(`app.home.task.${task.kind}`),
      what: `${supplierOf(state, p)?.name ?? ''}, ${p.invoiceNumber}`,
      side: <span className={`${figure} text-[17px] text-ink`}>{usd(p.quote.amountCents, locale)}</span>,
      when: p.createdAt,
    }
  }

  const rows = tasks.map(row)

  return (
    <Panel aria-labelledby="home-turn">
      <PanelHead
        id="home-turn"
        title={t('app.home.turn')}
        meta={tasks.length ? t('app.home.turnMeta', { n: tasks.length }) : null}
        action={
          tasks.length > LIMIT ? (
            <Link href="/app/payments?view=mine" className={`${textLink} text-[13.5px]`}>
              {t('app.viewAll')}
            </Link>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <>
          <Empty title={t('app.home.clear')}>
            {waiting.length ? t('app.home.clearWaiting', { n: waiting.length }) : t(`app.home.clear.${me.role}`)}
          </Empty>
          {waiting.length > 0 && <WaitingList state={state} payments={waiting} />}
        </>
      ) : (
        <ul className="divide-y divide-hair">
          {rows.slice(0, LIMIT).map((r) => (
            <li key={r.key}>
              <Link
                href={r.href}
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3.5 transition-colors hover:bg-paper-hi"
              >
                <span className="size-2 rounded-full bg-brand-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{r.verb}</span>
                  <span className="block truncate text-[13.5px] text-muted">
                    {r.what}, {relative(r.when, locale, now)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {r.side}
                  <ChevronRight size={16} className="text-ink/30 transition-colors group-hover:text-ink" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
