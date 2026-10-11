'use client'

import Link from 'next/link'
import { relative, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { code, figure, label, td, textLink, th, tr } from '../kit/styles'
import { ListNetworks } from './ListNetworks'
import { ListPhoneRow } from './ListPhoneRow'
import { ListShareBar } from './ListShareBar'
import { ListSortHeader } from './ListSortHeader'
import { ListSpark } from './ListSpark'
import { placeLabel, type SortKey, type SortState, type SupplierRow } from './ListStats'

/** Table on desktop, plain list on phones (the columns do not fit). */
export function SupplierTable({ rows, sort, onSort }: { rows: SupplierRow[]; sort: SortState; onSort: (key: SortKey) => void }) {
  const { t, locale } = useT()
  return (
    <>
      <div className="relative overflow-x-auto max-md:hidden">
        <table className="w-full min-w-[920px] text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-rule">
              <ListSortHeader label={t('app.sup.col.supplier')} sortKey="name" sort={sort} onSort={onSort} />
              <th scope="col" className={th}>
                {t('app.slist.col.port')}
              </th>
              <th scope="col" className={th}>
                {t('app.sup.col.networks')}
              </th>
              <th scope="col" className={th}>
                {t('app.slist.col.trend')}
              </th>
              <th scope="col" className={th}>
                {t('app.slist.col.share')}
              </th>
              <ListSortHeader label={t('app.sup.col.paid')} sortKey="paid" sort={sort} onSort={onSort} align="right" />
              <ListSortHeader label={t('app.sup.col.last')} sortKey="last" sort={sort} onSort={onSort} />
              <th scope="col" className={`${th} text-right`}>
                <span className={label}>{t('app.sup.col.open')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ supplier: s, ...row }) => (
              <tr key={s.id} className={tr}>
                <td className={td}>
                  <Link href={`/app/suppliers/${s.id}`} className={textLink}>
                    {s.name}
                  </Link>
                  <span className="mt-0.5 block text-[13px] text-muted">{placeLabel(s, locale)}</span>
                </td>
                <td className={`${td} ${code} text-ink/80`}>{s.port}</td>
                <td className={td}>
                  <ListNetworks supplier={s} />
                </td>
                <td className={td}>
                  <ListSpark months={row.months} />
                </td>
                <td className={td}>
                  <ListShareBar share={row.share} />
                </td>
                <td className={`${td} text-right`}>
                  <span className={`${figure} text-[17px]`}>{usd(row.paidCents, locale)}</span>
                </td>
                <td className={`${td} text-muted`}>{row.lastPaidAt ? relative(row.lastPaidAt, locale) : t('app.sup.never')}</td>
                <td className={`${td} text-right tabular-nums`}>{row.open}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-hair md:hidden">
        {rows.map((row) => (
          <ListPhoneRow key={row.supplier.id} row={row} />
        ))}
      </ul>
    </>
  )
}
