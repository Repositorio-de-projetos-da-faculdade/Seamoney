'use client'

import clsx from 'clsx'
import { useState } from 'react'
import { compactUsd, monthLabel, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { MonthStack } from '@/lib/demo/reportData'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { ChartTip, Gridlines, Key, niceMax, SERIES } from './chartKit'

/**
 * Amount paid per month, one column per month stacked by network (Tempo at the base, Solana above, a 2px gap between),
 * the month's total on the cap. Hover or focus a month for the exact values; the table below carries them all.
 */
export function PaidByMonth({ stacks }: { stacks: MonthStack[] }) {
  const { t, locale } = useT()
  const [active, setActive] = useState<number | null>(null)
  const totals = stacks.map((s) => s.tempo + s.solana)
  const max = niceMax(Math.max(0, ...totals))
  const any = totals.some((v) => v > 0)
  const short = (v: number) => compactUsd(v, locale).replace(/US\$\s?/, '$')

  return (
    <Panel aria-labelledby="rx-month">
      <PanelHead
        id="rx-month"
        title={t('app.rx.month')}
        meta={t('app.rx.month.meta')}
        action={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Key color={SERIES.tempo}>{t('app.net.tempo')}</Key>
            <Key color={SERIES.solana}>{t('app.net.solana')}</Key>
          </span>
        }
      />
      {!any ? (
        <Empty title={t('app.rep.empty')}>{t('app.rep.empty.body')}</Empty>
      ) : (
        <div className="px-5 pb-4 pt-6">
          <div className="relative ml-12 h-56" onMouseLeave={() => setActive(null)}>
            <Gridlines max={max} format={short} />
            <div className="absolute inset-0 flex items-end">
              {stacks.map((s, i) => {
                const totalCents = totals[i]
                const solanaTop = s.solana > 0
                return (
                  <button
                    key={s.month}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${monthLabel(s.month, locale)}: ${usd(totalCents, locale)}`}
                    className={clsx('group relative flex h-full flex-1 flex-col items-center justify-end focus-visible:outline-none', active === i && 'bg-ink/[0.03]')}
                  >
                    {totalCents > 0 ? <span className="mb-1 font-data text-[10.5px] tabular-nums text-ink">{short(totalCents)}</span> : null}
                    <span className="flex w-6 flex-col-reverse gap-[2px]" style={{ height: `${(totalCents / max) * 100}%` }} aria-hidden="true">
                      {s.tempo > 0 ? (
                        <span className={clsx('w-full', !solanaTop && 'rounded-t-[4px]')} style={{ flexGrow: s.tempo, background: SERIES.tempo }} />
                      ) : null}
                      {solanaTop ? <span className="w-full rounded-t-[4px]" style={{ flexGrow: s.solana, background: SERIES.solana }} /> : null}
                    </span>
                    <span className="absolute -bottom-6 font-data text-[10px] uppercase tracking-[0.06em] text-muted group-focus-visible:text-ink">{monthLabel(s.month, locale)}</span>
                  </button>
                )
              })}
            </div>
            {active !== null ? (
              <ChartTip
                title={`${monthLabel(stacks[active].month, locale)} ${stacks[active].month.slice(0, 4)}`}
                left={((active + 0.5) / stacks.length) * 100}
                className="-top-3 -translate-y-full"
                rows={[
                  { key: 'total', label: t('app.rx.total'), value: usd(totals[active], locale), strong: true },
                  { key: 'tempo', color: SERIES.tempo, label: t('app.net.tempo'), value: usd(stacks[active].tempo, locale) },
                  { key: 'solana', color: SERIES.solana, label: t('app.net.solana'), value: usd(stacks[active].solana, locale) },
                  { key: 'count', label: t('app.rx.payments'), value: String(stacks[active].count) },
                ]}
              />
            ) : null}
          </div>
          <div className="h-7" />
          <div className="sr-only">
            <table>
              <caption>{t('app.rx.month')}</caption>
              <thead>
                <tr>
                  <th>{t('app.rep.col.month')}</th>
                  <th>{t('app.net.tempo')}</th>
                  <th>{t('app.net.solana')}</th>
                  <th>{t('app.rx.total')}</th>
                </tr>
              </thead>
              <tbody>
                {stacks.map((s, i) => (
                  <tr key={s.month}>
                    <td>{monthLabel(s.month, locale)}</td>
                    <td>{usd(s.tempo, locale)}</td>
                    <td>{usd(s.solana, locale)}</td>
                    <td>{usd(totals[i], locale)}</td>
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
