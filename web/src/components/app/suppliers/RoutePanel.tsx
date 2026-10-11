'use client'

import { useT } from '@/lib/i18n/client'
import type { DemoState, Supplier } from '@/lib/demo/types'
import { NightChart } from '../chart/NightChart'
import { vesselsOf } from '../chart/voyage'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { label } from '../kit/styles'
import { countryName } from './helpers'

/** Voyages to this supplier on the night chart, falling back to the voyage of the latest payment. */
export function RoutePanel({ state, supplier }: { state: DemoState; supplier: Supplier }) {
  const { t, locale } = useT()
  const own = vesselsOf(state).filter((v) => v.supplier.id === supplier.id)
  const latest = state.payments
    .filter((p) => p.supplierId === supplier.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const vessels = own.length ? own : latest ? vesselsOf(state, latest.id) : []
  const place = supplier.port || supplier.city || countryName(supplier.country, locale)

  return (
    <Panel aria-labelledby="sup-route">
      <PanelHead id="sup-route" title={t('app.sdoc.route.title')} />
      {vessels.length === 0 ? (
        <Empty title={t('app.sdoc.route.empty.title')}>{t('app.sdoc.route.empty.body')}</Empty>
      ) : (
        <div className="bg-abyss px-3 pb-3 pt-4">
          <NightChart vessels={vessels} title={t('app.sdoc.route.chart', { place })} />
          <p className={`${label} mt-3 px-2 text-foam/80`}>{t('app.sdoc.route.caption', { place })}</p>
        </div>
      )}
    </Panel>
  )
}
