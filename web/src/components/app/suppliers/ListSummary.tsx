'use client'

import clsx from 'clsx'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { figure, label } from '../kit/styles'
import type { summarize } from './ListStats'

type Totals = ReturnType<typeof summarize>

/** Four figures on one strip, split by hairlines. The 90-day spend is simulated, so the strip says so. */
export function ListSummary({ totals }: { totals: Totals }) {
  const { t, locale } = useT()
  const cells = [
    { key: 'suppliers', name: t('app.slist.sum.suppliers'), value: String(totals.suppliers), warn: false },
    { key: 'paid90', name: t('app.slist.sum.paid90'), value: usd(totals.paid90, locale), warn: false },
    { key: 'open', name: t('app.slist.sum.open'), value: String(totals.open), warn: false },
    { key: 'waiting', name: t('app.slist.sum.waiting'), value: String(totals.waiting), warn: totals.waiting > 0 },
  ]
  return (
    <div className="border-b border-rule">
      <dl className="grid grid-cols-2 gap-px bg-rule md:grid-cols-4">
        {cells.map((c) => (
          <div key={c.key} className="min-w-0 bg-sheet px-5 py-4">
            <dt className={label}>{c.name}</dt>
            <dd className={clsx(figure, 'mt-1 truncate text-[24px]', c.warn && 'text-warn-ink')}>{c.value}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-2 px-5 py-2.5 text-[12.5px] text-muted">
        <span className="size-[7px] shrink-0 rotate-45 bg-signal" aria-hidden="true" />
        {t('app.slist.sim')}
      </p>
    </div>
  )
}
