'use client'

import clsx from 'clsx'
import { NavArrowDown } from 'iconoir-react'
import { th } from '../kit/styles'
import type { SortKey, SortState } from './ListStats'

/** A column header that sorts the list. The active one carries aria-sort. */
export function ListSortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === sortKey
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={clsx(th, align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          'inline-flex items-center gap-1 rounded-[2px] uppercase transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-mint/60',
          active && 'text-ink',
        )}
      >
        {label}
        <NavArrowDown
          width={13}
          height={13}
          strokeWidth={1.5}
          aria-hidden="true"
          className={clsx('shrink-0 transition-transform', !active && 'opacity-0', active && sort.dir === 'asc' && 'rotate-180')}
        />
      </button>
    </th>
  )
}
