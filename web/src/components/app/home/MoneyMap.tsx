'use client'

import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { networkSplit, topSuppliers } from '@/lib/demo/insights'
import type { DemoState } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { NetworkTag } from '../kit/Status'
import { figure, label } from '../kit/styles'

const pctOf = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

/** Paid in the last 90 days: the top suppliers as shares of the total, and the split between networks. */
export function MoneyMap({ state, now }: { state: DemoState; now: number }) {
  const { t, locale } = useT()
  const top = topSuppliers(state, now)
  const nets = networkSplit(state, now)
  const netTotal = nets.tempo.cents + nets.solana.cents

  return (
    <Panel aria-labelledby="home-map">
      <PanelHead id="home-map" title={t('app.home.map')} meta={t('app.home.mapMeta')} />
      {top.rows.length === 0 ? (
        <Empty title={t('app.home.map.none')} />
      ) : (
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0">
            <h3 className={label}>{t('app.home.map.suppliers')}</h3>
            <ul className="mt-3 space-y-3">
              {top.rows.map((row) => {
                const share = pctOf(row.cents, top.totalCents)
                return (
                  <li key={row.supplier.id}>
                    <div className="flex items-baseline justify-between gap-4 text-[14px]">
                      <span className="truncate text-ink">{row.supplier.name}</span>
                      <span className={`${figure} shrink-0 text-[15px] text-ink`}>{usd(row.cents, locale)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-paper-hi" role="img" aria-label={t('app.home.map.count', { n: row.count, pct: share })}>
                      <span className="block h-full bg-brand-600" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className={label}>{t('app.home.map.networks')}</h3>
            <ul className="mt-3 space-y-3">
              {(['tempo', 'solana'] as const).map((network) => (
                <li key={network} className="flex items-center justify-between gap-4 border-b border-hair pb-3 last:border-b-0">
                  <NetworkTag network={network} />
                  <span className="text-right text-[13px] text-muted">
                    <span className={`${figure} block text-[17px] text-ink`}>{usd(nets[network].cents, locale)}</span>
                    {t('app.home.map.count', { n: nets[network].count, pct: pctOf(nets[network].cents, netTotal) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  )
}
