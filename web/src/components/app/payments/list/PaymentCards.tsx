'use client'

import Link from 'next/link'
import { usd } from '@/lib/format'
import { supplierOf } from '@/lib/demo/selectors'
import type { DemoState, Member, Payment } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Status } from '../../kit/Status'
import { code, figure } from '../../kit/styles'
import { DueCell } from './DueCell'
import { JourneyTicks } from './JourneyTicks'
import { NextCell } from './PaymentTable'

/** The list on a phone: supplier and amount on one line, invoice and status under it, then whose turn and when due. */
export function PaymentCards({ state, me, payments, now }: { state: DemoState; me: Member; payments: Payment[]; now: number }) {
  const { locale } = useT()
  return (
    <ul className="divide-y divide-hair">
      {payments.map((p) => (
        <li key={p.id}>
          <Link href={`/app/payments/${p.id}`} className="block px-4 py-3.5 active:bg-paper-hi">
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-medium text-ink">{supplierOf(state, p)?.name}</span>
              <span className={`${figure} shrink-0 text-[17px] text-ink`}>{usd(p.quote.amountCents, locale)}</span>
            </span>
            <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className={`${code} text-muted`}>{p.invoiceNumber}</span>
              <Status status={p.status} className="!text-[12.5px]" />
            </span>
            <JourneyTicks payment={p} />
            <span className="mt-2 flex items-start justify-between gap-3 text-[13px]">
              <NextCell state={state} me={me} payment={p} />
              <span className="shrink-0 text-right">
                <DueCell payment={p} now={now} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
