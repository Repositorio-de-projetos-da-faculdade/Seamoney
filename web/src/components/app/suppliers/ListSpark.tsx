'use client'

import clsx from 'clsx'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'

/** Six thin bars, one per month, oldest first. The numbers are read out by a screen reader sentence instead. */
export function ListSpark({ months }: { months: number[] }) {
  const { t, locale } = useT()
  const max = Math.max(...months, 1)
  const total = months.reduce((a, b) => a + b, 0)
  return (
    <span className="relative inline-flex">
      <span aria-hidden="true" className="flex h-6 items-end gap-[3px]">
        {months.map((v, i) => (
          <span
            key={i}
            className={clsx('w-[5px] bg-brand-600', v === 0 && 'opacity-30')}
            style={{ height: `${Math.max((v / max) * 100, 8)}%` }}
          />
        ))}
      </span>
      <span className="sr-only">{t('app.slist.spark.sr', { total: usd(total, locale) })}</span>
    </span>
  )
}
