import { dateShort, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { supplierTotals } from '@/lib/demo/selectors'
import type { DemoState, Supplier } from '@/lib/demo/types'
import { Panel } from '../kit/Panel'
import { figure, label } from '../kit/styles'
import { averageCents, totalCents } from './detailFormat'

/** One panel with hairline cells: paid, count, average, last payment and open orders for this supplier. */
export function FiguresStrip({ state, supplier }: { state: DemoState; supplier: Supplier }) {
  const { t, locale } = useT()
  const totals = supplierTotals(state, supplier.id)
  const payments = state.payments.filter((p) => p.supplierId === supplier.id)
  const average = payments.length ? usd(averageCents(totalCents(payments), payments.length), locale) : '-'

  const cells = [
    { key: 'paid', label: t('app.sdoc.fig.paid'), value: usd(totals.paidCents, locale), note: null },
    { key: 'count', label: t('app.sdoc.fig.count'), value: String(totals.count), note: null },
    { key: 'average', label: t('app.sdoc.fig.average'), value: average, note: t('app.sdoc.fig.averageNote') },
    { key: 'last', label: t('app.sdoc.fig.last'), value: totals.lastPaidAt ? dateShort(totals.lastPaidAt, locale) : t('app.sdoc.fig.none'), note: null },
    { key: 'open', label: t('app.sdoc.fig.open'), value: String(totals.open), note: null },
  ]

  return (
    <Panel>
      <dl className="grid grid-cols-2 md:grid-cols-5">
        {cells.map((c) => (
          <div key={c.key} className="min-w-0 border-b border-r border-hair px-5 py-4 last:border-r-0 md:border-b-0 md:[&:not(:last-child)]:border-r">
            <dt className={label}>{c.label}</dt>
            <dd className={`${figure} mt-2 break-words text-[24px] leading-tight text-ink`}>{c.value}</dd>
            {c.note ? <dd className="mt-1 text-[12.5px] text-muted">{c.note}</dd> : null}
          </div>
        ))}
      </dl>
    </Panel>
  )
}
