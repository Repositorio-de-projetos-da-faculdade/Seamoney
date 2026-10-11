'use client'

import { useState, type PointerEvent } from 'react'
import { compactUsd, monthLabel, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { MonthStack } from '@/lib/demo/reportData'
import { cumulativeSaving } from '@/lib/demo/reportData'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { ChartTip, Gridlines, niceMax, SERIES } from './chartKit'

/**
 * What the route saved against a bank wire, added up month after month (an estimate: the bank cost is assumed). One
 * 2px line with a 10% wash under it, the last value labelled at the end; a crosshair finds the nearest month.
 */
export function SavingCurve({ stacks, bankPct }: { stacks: MonthStack[]; bankPct: number }) {
  const { t, locale } = useT()
  const [active, setActive] = useState<number | null>(null)
  const curve = cumulativeSaving(stacks)
  const last = curve.at(-1)?.cents ?? 0
  const max = niceMax(Math.max(0, ...curve.map((c) => c.cents)))
  const short = (v: number) => compactUsd(v, locale).replace(/US\$\s?/, '$')
  // x at the middle of each month's band, so the curve lines up with the columns of the chart beside it
  const x = (i: number) => ((i + 0.5) / curve.length) * 100
  const y = (cents: number) => 100 - (cents / max) * 100
  const line = curve.map((c, i) => `${i ? 'L' : 'M'}${x(i)},${y(c.cents)}`).join(' ')
  const area = `${line} L${x(curve.length - 1)},100 L${x(0)},100 Z`

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.floor(((e.clientX - box.left) / box.width) * curve.length)
    setActive(Math.min(curve.length - 1, Math.max(0, i)))
  }

  return (
    <Panel aria-labelledby="rx-save">
      <PanelHead id="rx-save" title={t('app.rx.save')} meta={t('app.rx.save.meta', { pct: bankPct })} />
      {last <= 0 ? (
        <Empty title={t('app.rep.empty')}>{t('app.rep.empty.body')}</Empty>
      ) : (
        <div className="px-5 pb-4 pt-6">
          <div className="relative ml-12 h-56" onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
            <Gridlines max={max} format={short} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              <path d={area} fill={SERIES.saving} opacity="0.1" />
              <path d={line} fill="none" stroke={SERIES.saving} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {active !== null ? <line x1={x(active)} x2={x(active)} y1="0" y2="100" stroke="#06182c" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
            </svg>
            {/* the end dot and the active dot are HTML, so they stay round whatever the box's proportions */}
            {[curve.length - 1, ...(active !== null && active !== curve.length - 1 ? [active] : [])].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-sheet"
                style={{ left: `${x(i)}%`, top: `${y(curve[i].cents)}%`, background: SERIES.saving }}
              />
            ))}
            <span
              className="absolute -translate-y-full whitespace-nowrap pb-2 font-data text-[11px] tabular-nums text-ink"
              style={{ right: `${100 - x(curve.length - 1)}%`, top: `${y(last)}%` }}
            >
              {usd(last, locale)}
            </span>
            <div className="absolute -bottom-6 inset-x-0 flex" aria-hidden="true">
              {curve.map((c) => (
                <span key={c.month} className="flex-1 text-center font-data text-[10px] uppercase tracking-[0.06em] text-muted">
                  {monthLabel(c.month, locale)}
                </span>
              ))}
            </div>
            {active !== null ? (
              <ChartTip
                title={`${monthLabel(curve[active].month, locale)} ${curve[active].month.slice(0, 4)}`}
                left={x(active)}
                className="-top-3 -translate-y-full"
                rows={[
                  { key: 'cum', color: SERIES.saving, label: t('app.rx.save.cum'), value: usd(curve[active].cents, locale), strong: true },
                  { key: 'month', label: t('app.rx.save.month'), value: usd(stacks[active].bank - stacks[active].fee, locale) },
                ]}
              />
            ) : null}
          </div>
          <div className="h-7" />
          <div className="sr-only">
            <table>
              <caption>{t('app.rx.save')}</caption>
              <thead>
                <tr>
                  <th>{t('app.rep.col.month')}</th>
                  <th>{t('app.rx.save.month')}</th>
                  <th>{t('app.rx.save.cum')}</th>
                </tr>
              </thead>
              <tbody>
                {curve.map((c, i) => (
                  <tr key={c.month}>
                    <td>{monthLabel(c.month, locale)}</td>
                    <td>{usd(stacks[i].bank - stacks[i].fee, locale)}</td>
                    <td>{usd(c.cents, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  )
}
