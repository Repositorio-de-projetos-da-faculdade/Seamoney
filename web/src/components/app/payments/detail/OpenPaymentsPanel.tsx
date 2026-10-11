'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { DemoState, Payment } from '@/lib/demo/types'
import { Panel, PanelHead } from '../../kit/Panel'
import { Status } from '../../kit/Status'
import { code, figure } from '../../kit/styles'

/** Statuses that no longer need anyone's attention. */
const CLOSED: string[] = ['reconciled', 'cancelled', 'rejected']

/** Up to three other payments to the same supplier that are still moving. Renders nothing when there are none. */
export function OpenPaymentsPanel({ state, payment: p }: { state: DemoState; payment: Payment }) {
  const { t, locale } = useT()
  const open = state.payments.filter((x) => x.supplierId === p.supplierId && x.id !== p.id && !CLOSED.includes(x.status)).slice(0, 3)
  if (open.length === 0) return null
  return (
    <Panel aria-labelledby="doc-open">
      <PanelHead id="doc-open" title={t('app.pdoc.open.title')} />
      <ul className="divide-y divide-hair">
        {open.map((x) => (
          <li key={x.id}>
            <Link
              href={`/app/payments/${x.id}`}
              className={clsx('flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-ink/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600')}
            >
              <span className={clsx(code, 'text-ink')}>{x.invoiceNumber}</span>
              <span className="flex items-center gap-3">
                <span className={clsx(figure, 'text-[16px] tabular-nums text-ink')}>{usd(x.quote.amountCents, locale)}</span>
                <Status status={x.status} className="!text-[12.5px]" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
