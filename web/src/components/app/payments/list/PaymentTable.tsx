'use client'

import clsx from 'clsx'
import { NavArrowDown, NavArrowUp } from 'iconoir-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { supplierOf } from '@/lib/demo/selectors'
import type { DemoState, Member, Payment } from '@/lib/demo/types'
import { NetworkTag, Status } from '../../kit/Status'
import { btnLine, btnSmall, code, figure, td, th, tr } from '../../kit/styles'
import { useNextStep } from '../shared/useNextStep'
import { DueCell } from './DueCell'
import { JourneyTicks } from './JourneyTicks'
import type { Sort, SortKey } from './sort'

/** Who acts next, in the same words as the payment page. Your turn is set in green so it stands out in a long list. */
export function NextCell({ state, me, payment }: { state: DemoState; me: Member; payment: Payment }) {
  const step = useNextStep()(state, me, payment)
  return (
    <span className={clsx('text-[13.5px]', step.tone === 'you' ? 'font-medium text-ok-ink' : step.tone === 'stop' ? 'text-bad-ink' : 'text-muted')}>
      {step.tone === 'you' ? <span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand-600 align-middle" aria-hidden="true" /> : null}
      {step.short}
    </span>
  )
}

/** A column head that sorts the list; the arrow shows the current direction. */
function SortHead({ label, by, sort, onSort, className }: { label: string; by: SortKey; sort: Sort; onSort: (k: SortKey) => void; className?: string }) {
  const on = sort.key === by
  const Arrow = on && sort.dir === 'asc' ? NavArrowUp : NavArrowDown
  return (
    <th scope="col" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={clsx(th, className)}>
      <button type="button" onClick={() => onSort(by)} className={clsx('inline-flex items-center gap-1 uppercase hover:text-ink', on && 'text-ink')}>
        {label}
        <Arrow width={12} height={12} strokeWidth={1.8} className={on ? 'opacity-100' : 'opacity-35'} aria-hidden="true" />
      </button>
    </th>
  )
}

export function PaymentTable({
  state,
  me,
  payments,
  now,
  sort,
  onSort,
  showAction,
}: {
  state: DemoState
  me: Member
  payments: Payment[]
  now: number
  sort: Sort
  onSort: (k: SortKey) => void
  /** the "Waiting for you" view puts a direct way into each decision on the row */
  showAction: boolean
}) {
  const { t, locale } = useT()
  const router = useRouter()
  return (
    <table className="w-full min-w-[920px] text-[14px]">
      <thead className="border-b border-rule">
        <tr>
          <th scope="col" className={clsx(th, 'pl-5')}>
            {t('app.pay.col.supplier')}
          </th>
          <SortHead label={t('app.pay.col.amount')} by="amount" sort={sort} onSort={onSort} className="text-right [&>button]:flex-row-reverse" />
          <th scope="col" className={th}>
            {t('app.pay.col.status')}
          </th>
          <th scope="col" className={th}>
            {t('app.pay.col.next')}
          </th>
          <SortHead label={t('app.pay.col.due')} by="due" sort={sort} onSort={onSort} className="pr-5" />
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => {
          const supplier = supplierOf(state, p)
          const href = `/app/payments/${p.id}`
          return (
            // the whole row opens the payment; the supplier link keeps it reachable by keyboard
            <tr key={p.id} className={clsx(tr, 'cursor-pointer')} onClick={() => router.push(href)}>
              <td className={clsx(td, 'pl-5')}>
                <Link href={href} className="font-medium text-ink underline decoration-transparent underline-offset-4 hover:decoration-ink">
                  {supplier?.name}
                </Link>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
                  <span className={code}>{p.invoiceNumber}</span>
                  <NetworkTag network={p.network} />
                </span>
              </td>
              <td className={clsx(td, figure, 'whitespace-nowrap text-right text-[17px] text-ink')}>{usd(p.quote.amountCents, locale)}</td>
              <td className={td}>
                <Status status={p.status} />
                <JourneyTicks payment={p} />
              </td>
              <td className={clsx(td, 'max-w-[280px]')}>
                {showAction ? (
                  <Link href={href} onClick={(e) => e.stopPropagation()} className={clsx(btnLine, btnSmall)}>
                    {p.status === 'pending_approval' ? t('app.plist.reviewApprove') : t('app.plist.reviewSend')}
                  </Link>
                ) : (
                  <NextCell state={state} me={me} payment={p} />
                )}
              </td>
              <td className={clsx(td, 'whitespace-nowrap pr-5 tabular-nums')}>
                <DueCell payment={p} now={now} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
