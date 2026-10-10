'use client'

import { dateShort, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'
import { total } from '@/lib/demo/reportData'
import { label } from '../kit/styles'

/** "+41% vs the previous 3 months", or nothing when there is no previous period to compare with. */
export function changeText(now: number, before: number, span: string | null, t: ReturnType<typeof useT>['t']) {
  if (!span || before <= 0) return null
  const pct = Math.round((Math.abs(now - before) / before) * 100)
  return t('app.rep.change', { pct: `${now >= before ? '+' : '−'}${pct}%`, span })
}

/**
 * The top of the report, set like a statement: who, which period, the one number it leads with (amount paid), and
 * what moving US$ 100 costs here against a bank wire, so the saving reads in plain money.
 */
export function StatementHeader({
  company,
  months,
  paid,
  prev,
  span,
  feeBps,
  bankPct,
}: {
  company: string
  months: string[]
  paid: Payment[]
  prev: Payment[]
  span: string | null
  feeBps: number
  bankPct: number
}) {
  const { t, locale } = useT()
  const amount = total(paid, (p) => p.quote.amountCents)
  const change = changeText(amount, total(prev, (p) => p.quote.amountCents), span, t)
  const from = `${months[0]}-01T12:00:00Z`
  const lastMonth = months.at(-1)!
  const [y, m] = lastMonth.split('-').map(Number)
  const to = new Date(Date.UTC(y, m, 0, 12)).toISOString()
  const fee = feeBps / 100
  // per US$ 100 paid, in dollars, with the same assumptions as every quote
  const per = [
    { key: 'bank', name: t('app.rx.per.bank', { pct: bankPct }), value: bankPct, color: 'bg-navy-500' },
    { key: 'route', name: t('app.rx.per.route', { pct: fee }), value: fee, color: 'bg-brand-600' },
  ]

  return (
    <section aria-labelledby="rx-head" className="grid border border-rule bg-sheet lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="p-6 lg:p-7">
        <p className={label}>{t('app.rx.statement', { company })}</p>
        <p className="mt-1 text-[13.5px] text-muted">
          {dateShort(from, locale)} {t('app.rx.to')} {dateShort(to, locale)}
        </p>
        <h2 id="rx-head" className="sr-only">
          {t('app.rep.amount')}
        </h2>
        <p className="mt-6 font-grotesk text-[52px] font-light leading-none tracking-[-0.04em] text-ink tabular-nums sm:text-[64px]">{usd(amount, locale)}</p>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-muted">
          <span>{t('app.rx.headline', { n: paid.length })}</span>
          {paid.length ? <span>{t('app.rx.avg', { amount: usd(Math.round(amount / paid.length), locale) })}</span> : null}
          {change ? <span className="font-medium text-ink">{change}</span> : null}
        </p>
      </div>
      <div className="border-rule p-6 max-lg:border-t lg:border-l lg:p-7">
        <p className={label}>{t('app.rx.per')}</p>
        <ul className="mt-5 space-y-4">
          {per.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-4 text-[14px]">
                <span className="text-muted">{r.name}</span>
                <span className="font-grotesk text-[22px] font-light tabular-nums tracking-[-0.02em] text-ink">{usd(r.value * 100, locale)}</span>
              </div>
              <div className="mt-2 h-2 bg-ink/[0.06]">
                <div className={`h-2 rounded-r-[4px] ${r.color}`} style={{ width: `${(r.value / Math.max(bankPct, fee)) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] leading-relaxed text-muted">{t('app.rx.per.note', { keep: usd((bankPct - fee) * 100, locale), pct: bankPct })}</p>
      </div>
    </section>
  )
}
