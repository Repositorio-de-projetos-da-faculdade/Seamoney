'use client'

import { useT } from '@/lib/i18n/client'
import type { DemoState, Supplier } from '@/lib/demo/types'
import { LogEntry } from '../log/LogEntry'
import { Facts, type Row } from '../kit/Fields'
import { Panel, PanelHead } from '../kit/Panel'
import { countryName } from './helpers'

/** Profile facts in two columns on wide screens; the edit action lives in the page header. */
export function ProfilePanel({ supplier }: { supplier: Supplier }) {
  const { t, locale } = useT()
  const optional: (Row | null)[] = [
    supplier.port ? { label: t('app.sup.profile.port'), value: supplier.port } : null,
    supplier.city ? { label: t('app.sup.profile.city'), value: supplier.city } : null,
    supplier.email ? { label: t('app.sup.profile.email'), value: supplier.email } : null,
  ]
  const rows: Row[] = [
    { label: t('app.sup.profile.name'), value: supplier.name },
    { label: t('app.sup.profile.country'), value: countryName(supplier.country, locale) },
    ...optional.filter((r): r is Row => r !== null),
  ]
  const half = Math.ceil(rows.length / 2)

  return (
    <Panel aria-labelledby="sup-profile">
      <PanelHead id="sup-profile" title={t('app.sup.profile.title')} />
      <div className="grid lg:grid-cols-2">
        <Facts rows={rows.slice(0, half)} />
        <div className="max-lg:border-t border-hair">
          <Facts rows={rows.slice(half)} />
        </div>
      </div>
    </Panel>
  )
}

export function ActivityPanel({ state, supplier }: { state: DemoState; supplier: Supplier }) {
  const { t } = useT()
  const lines = state.activity
    .filter((a) => a.supplierId === supplier.id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20)

  return (
    <Panel aria-labelledby="sup-activity">
      <PanelHead id="sup-activity" title={t('app.sup.activity.title')} />
      {lines.length === 0 ? (
        <p className="px-5 py-6 text-[14px] text-muted">{t('app.sup.activity.empty')}</p>
      ) : (
        <div className="divide-y divide-hair px-5">
          {lines.map((a) => (
            <LogEntry key={a.id} state={state} activity={a} bare />
          ))}
        </div>
      )}
    </Panel>
  )
}
