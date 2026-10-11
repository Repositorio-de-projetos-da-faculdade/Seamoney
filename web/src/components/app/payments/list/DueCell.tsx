'use client'

import clsx from 'clsx'
import { dateShort } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'
import { daysUntil, stillDue } from './due'

/** The due date as a person reads it: "in 18 days", "due today", "3 days late", with the date under it. */
export function DueCell({ payment, now }: { payment: Payment; now: number }) {
  const { t, locale } = useT()
  const date = dateShort(payment.dueDate, locale)
  const days = daysUntil(payment, now)
  if (days === null || !stillDue(payment)) return <span className="text-muted">{date}</span>
  const text = days < 0 ? t('app.plist.late', { n: -days }) : days === 0 ? t('app.plist.today') : t('app.plist.in', { n: days })
  return (
    <span className="block">
      <span className={clsx('block font-medium', days < 0 ? 'text-bad-ink' : days <= 7 ? 'text-warn-ink' : 'text-ink')}>{text}</span>
      <span className="block text-[12.5px] text-muted">{date}</span>
    </span>
  )
}
