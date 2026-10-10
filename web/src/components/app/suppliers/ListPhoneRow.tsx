'use client'

import Link from 'next/link'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { code, figure, label } from '../kit/styles'
import { ListSpark } from './ListSpark'
import type { SupplierRow } from './ListStats'

/** One supplier on a phone: name and port, paid to date, and the six-month trend. */
export function ListPhoneRow({ row }: { row: SupplierRow }) {
  const { t, locale } = useT()
  const { supplier: s } = row
  return (
    <li>
      <Link href={`/app/suppliers/${s.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-paper-hi">
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{s.name}</span>
          <span className={`${code} block truncate text-muted`}>{s.port}</span>
        </span>
        <span className="text-right">
          <span className={`${label} block`}>{t('app.sup.col.paid')}</span>
          <span className={`${figure} block text-[17px]`}>{usd(row.paidCents, locale)}</span>
        </span>
        <span className="justify-self-start">
          <ListSpark months={row.months} />
        </span>
        <span className="justify-self-end text-[13px] text-muted">{row.open > 0 ? t('app.sup.open.n', { n: row.open }) : null}</span>
      </Link>
    </li>
  )
}
