'use client'

import { useT } from '@/lib/i18n/client'
import { supplierOf } from '@/lib/demo/selectors'
import type { DemoState, Payment } from '@/lib/demo/types'
import { NightChart } from '../../chart/NightChart'
import { vesselsOf } from '../../chart/voyage'
import { Panel, PanelHead } from '../../kit/Panel'

/** The voyage from Santos to the supplier's port, drawn on the night chart with this payment's vessel in focus. */
export function RoutePanel({ state, payment: p }: { state: DemoState; payment: Payment }) {
  const { t } = useT()
  const supplier = supplierOf(state, p)
  return (
    <Panel aria-labelledby="doc-route" className="print:hidden">
      <PanelHead id="doc-route" title={t('app.pdoc.route.title')} />
      <div className="bg-abyss px-3 py-3 sm:px-5 sm:py-4">
        <NightChart vessels={vesselsOf(state, p.id)} focus={p.id} title={t('app.pdoc.route.frame')} />
      </div>
      <p className="px-5 py-3 text-[13px] leading-relaxed text-muted">
        {t('app.pdoc.route.caption', { city: supplier?.city ?? '', port: supplier?.port ?? '', network: t(`app.net.${p.network}`) })}
      </p>
    </Panel>
  )
}
