'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { Segments } from '../kit/Segments'
import { fieldInput } from '../kit/styles'
import type { NetworkFilter } from './ListStats'

/** Search and network filter above the table, on one line on wide screens. */
export function ListToolbar({
  query,
  onQuery,
  network,
  onNetwork,
}: {
  query: string
  onQuery: (q: string) => void
  network: NetworkFilter
  onNetwork: (n: NetworkFilter) => void
}) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-3 border-b border-rule px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-sm sm:flex-1">
        <label htmlFor="supplier-search" className="sr-only">
          {t('app.sup.search')}
        </label>
        <input
          id="supplier-search"
          type="search"
          className={clsx(fieldInput)}
          placeholder={t('app.sup.search.ph')}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      <div className="min-w-0">
        <Segments<NetworkFilter>
          label={t('app.slist.net.label')}
          value={network}
          onChange={onNetwork}
          options={[
            { value: 'all', label: t('app.slist.net.all') },
            { value: 'tempo', label: t('app.net.tempo') },
            { value: 'solana', label: t('app.net.solana') },
          ]}
        />
      </div>
    </div>
  )
}
