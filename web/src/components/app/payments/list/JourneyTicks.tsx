'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'

/** How many of the six stages (created, approved, reais in, converted, sent, reconciled) a payment has passed. */
function reached(p: Payment): number {
  switch (p.status) {
    case 'pending_approval':
      return 1
    case 'approved':
      return 2
    case 'sending':
      return 4
    case 'sent':
      return 5
    case 'reconciled':
    case 'in_review':
      return 6
    case 'rejected':
      return 2
    case 'cancelled':
      return p.approval ? 3 : 2
  }
}

/** The payment page's journey, reduced to six ticks under the status; the last one is red when it stopped there. */
export function JourneyTicks({ payment }: { payment: Payment }) {
  const { t } = useT()
  const n = reached(payment)
  const stopped = payment.status === 'in_review' || payment.status === 'rejected' || payment.status === 'cancelled'
  return (
    <span className="mt-1.5 flex gap-[3px]" aria-label={t('app.plist.stage', { n: stopped ? n - 1 : n })}>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={clsx('h-[3px] w-3', i < n ? (stopped && i === n - 1 ? 'bg-bad-ink' : 'bg-brand-600') : 'bg-ink/12')}
        />
      ))}
    </span>
  )
}
