import { compactUsd, monthLabel, usd, type Locale } from '@/lib/format'
import type { T } from '@/lib/i18n/server'
import type { MonthPoint } from '@/lib/types'

const HEIGHT = 240

/** Grouped bars per month: what the bank would have cost vs what our route cost. Pure CSS, no chart library. */
export function SavingsChart({ data, t, locale }: { data: MonthPoint[]; t: T; locale: Locale }) {
  const max = Math.max(...data.flatMap((d) => [d.bankCents, d.routeCents]), 1)
  const empty = data.every((d) => d.bankCents === 0 && d.routeCents === 0)
  const ticks = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium text-muted">
        <span className="inline-flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-full bg-bank-soft" aria-hidden="true" />
          {t('chart.bank')}
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
          {t('chart.route')}
        </span>
      </div>

      {empty ? (
        <p className="py-10 text-center text-sm text-muted">{t('chart.empty')}</p>
      ) : (
        <div className="flex gap-3">
          <div className="flex flex-col justify-between text-right text-[11px] font-medium tabular-nums text-muted" style={{ height: HEIGHT }} aria-hidden="true">
            {ticks.map((tk) => (
              <span key={tk} className="-my-1.5">
                {tk === 0 ? '0' : compactUsd(Math.round(max * tk), locale)}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: HEIGHT }} aria-hidden="true">
              {ticks.map((tk) => (
                <div key={tk} className="border-t border-dashed border-line" />
              ))}
            </div>
            <div className="relative flex items-end justify-between gap-1 sm:gap-3" style={{ height: HEIGHT + 28 }}>
              {data.map((d) => (
                <div key={d.month} className="group relative flex min-w-0 flex-1 flex-col items-center gap-2" tabIndex={0}>
                  <div className="flex w-full items-end justify-center gap-0.5 sm:gap-1" style={{ height: HEIGHT }}>
                    <div className="w-full max-w-5 rounded-t-md bg-gradient-to-t from-bank-soft/70 to-bank-soft transition group-hover:from-bank/80 group-hover:to-bank group-focus:to-bank" style={{ height: `${(d.bankCents / max) * 100}%` }} />
                    <div className="w-full max-w-5 rounded-t-md bg-gradient-to-t from-brand-600 to-mint transition group-hover:brightness-110" style={{ height: `${(d.routeCents / max) * 100}%` }} />
                  </div>
                  <span className="h-[20px] text-xs font-medium capitalize text-muted">{monthLabel(d.month, locale)}</span>
                  <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-navy-900 px-3 py-2 text-xs text-white shadow-pop group-hover:block group-focus:block">
                    <p className="mb-1 font-bold capitalize">{monthLabel(d.month, locale)}</p>
                    <p className="flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full bg-bank-soft" aria-hidden="true" />
                      <span className="tabular-nums">{usd(d.bankCents, locale)}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
                      <span className="tabular-nums">{usd(d.routeCents, locale)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* the same numbers for screen readers */}
      <table className="sr-only">
        <caption>{t('chart.title')}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>{t('chart.bank')}</th>
            <th>{t('chart.route')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{monthLabel(d.month, locale)}</td>
              <td>{usd(d.bankCents, locale)}</td>
              <td>{usd(d.routeCents, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
