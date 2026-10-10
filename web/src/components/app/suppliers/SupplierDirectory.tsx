'use client'

import { useState } from 'react'
import { useDemoState, useMe } from '@/lib/demo/store'
import { roleCan } from '@/lib/demo/rules'
import { useT } from '@/lib/i18n/client'
import { Empty, Panel } from '../kit/Panel'
import { btnGo } from '../kit/styles'
import { Page } from '../shell/DeskShell'
import { AddSupplierDialog } from './AddSupplierDialog'
import { PendingWallets } from './PendingWallets'
import { ListSummary } from './ListSummary'
import { ListToolbar } from './ListToolbar'
import { buildRows, filterRows, nextSort, sortRows, summarize, type NetworkFilter, type SortKey, type SortState } from './ListStats'
import { SupplierTable } from './SupplierTable'

export function SupplierDirectory() {
  const { t, locale } = useT()
  const state = useDemoState()
  const me = useMe()
  const [nowMs] = useState(() => Date.now())
  const [query, setQuery] = useState('')
  const [network, setNetwork] = useState<NetworkFilter>('all')
  const [sort, setSort] = useState<SortState>({ key: 'paid', dir: 'desc' })
  const [adding, setAdding] = useState(false)
  if (!state || !me) return null

  const canEdit = roleCan(me.role, 'edit_suppliers')
  const rows = buildRows(state, nowMs)
  const shown = sortRows(filterRows(rows, query, network, locale), sort, locale)
  const onSort = (key: SortKey) => setSort((current) => nextSort(current, key))
  const addButton = canEdit ? (
    <button type="button" className={btnGo} onClick={() => setAdding(true)}>
      {t('app.sup.add')}
    </button>
  ) : null

  return (
    <Page title={t('app.sup.title')} lede={t('app.sup.lede')} actions={addButton}>
      <PendingWallets state={state} me={me} />
      <Panel>
        {state.suppliers.length === 0 ? (
          <Empty title={t('app.sup.empty.title')} action={addButton}>
            {t('app.sup.empty.body')}
          </Empty>
        ) : (
          <>
            <ListSummary totals={summarize(state, rows)} />
            <ListToolbar query={query} onQuery={setQuery} network={network} onNetwork={setNetwork} />
            {shown.length === 0 ? (
              <Empty title={query.trim() ? t('app.sup.empty.none', { q: query.trim() }) : t('app.slist.empty.network')} />
            ) : (
              <SupplierTable rows={shown} sort={sort} onSort={onSort} />
            )}
          </>
        )}
      </Panel>
      {canEdit ? <AddSupplierDialog open={adding} onClose={() => setAdding(false)} /> : null}
    </Page>
  )
}
