'use client'

import { compactUsd, monthLabel, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { monthlySeries } from '@/lib/demo/selectors'
import type { DemoState } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { figure, label } from '../kit/styles'

/** Estimated monthly saving of the route against a bank wire, over the last seven months. Always labelled as an estimate. */
export function SavingsChart({ state, now }: { state: DemoState; now: number }) {
  const { t, locale } = useT()
  const series = monthlySeries(state, now)
  const max = Math.max(1, ...series.map((m) => m.bankCents))
  const totalCents = series.reduce((sum, m) => sum + m.bankCents - m.routeCents, 0)
  const paid = series.some((m) => m.count > 0)
  const pct = state.settings.bankFeePct

  return (
    <Panel aria-labelledby="home-save">
      <PanelHead id="home-save" title={t('app.home.save')} meta={t('app.home.saveMeta', { pct })} />
      {!paid ? (
        <Empty title={t('app.home.save.none')} />
      ) : (
        <div className="space-y-5 px-5 pb-5">
          <div>
            <p className={label}>{t('app.home.save.total')}</p>
            <p className={`${figure} mt-1 text-[30px] leading-none text-ink`}>{usd(totalCents, locale)}</p>
            <p className="mt-1.5 text-[13px] text-muted">{t('app.home.save.totalNote', { pct })}</p>
          </div>
          <div aria-hidden="true">
            <div className="flex h-44 items-end gap-2 border-b border-ink/25">
              {series.map((m) => (
                <div key={m.month} className="flex h-full flex-1 items-end gap-[3px]">
                  <span className="flex-1 bg-bank" style={{ height: `${(m.bankCents / max) * 100}%` }} />
                  <span className="flex-1 bg-brand-600" style={{ height: `${(m.routeCents / max) * 100}%` }} />
                </div>
              ))}
            </div>
            {/* the month under each pair, and what the route saved that month (dollars, as in the title) */}
            <div className="mt-1.5 flex gap-2">
              {series.map((m) => (
                <div key={m.month} className="flex-1 text-center">
                  <span className="block font-data text-[10px] uppercase tracking-[0.06em] text-muted">{monthLabel(m.month, locale)}</span>
                  <span className="block font-data text-[10.5px] tabular-nums text-ok-ink">{m.bankCents - m.routeCents > 0 ? `+${compactUsd(m.bankCents - m.routeCents, locale).replace(/US\$\s?|\$/, '')}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sr-only">
            <table>
              <caption>{t('app.home.save.table')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('app.home.save.bank')}</th>
                  <th scope="col">{t('app.home.save.route')}</th>
                </tr>
              </thead>
              <tbody>
                {series.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{monthLabel(m.month, locale)}</th>
                    <td>{usd(m.bankCents, locale)}</td>
                    <td>{usd(m.routeCents, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted" aria-hidden="true">
            <li className="flex items-center gap-2">
              <span className="size-2 bg-bank" />
              {t('app.home.save.bank')}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2 bg-brand-600" />
              {t('app.home.save.route')}
            </li>
          </ul>
        </div>
      )}
    </Panel>
  )
}
