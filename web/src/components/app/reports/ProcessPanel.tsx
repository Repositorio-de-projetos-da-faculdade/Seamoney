'use client'

import { seconds } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { processStats } from '@/lib/demo/reportData'
import { Panel, PanelHead } from '../kit/Panel'
import { figure, label } from '../kit/styles'

type Stats = ReturnType<typeof processStats>

/**
 * How the payments of the period moved through the controls: how long a second person took to approve (median and
 * the slow tail), how fast the network confirmed, and how many stopped for a person to decide.
 */
export function ProcessPanel({ stats }: { stats: Stats }) {
  const { t, locale } = useT()
  const hours = (h: number | null) => (h === null ? '—' : t('app.rx.hours', { n: h.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 }) }))
  const big = [
    { key: 'approval', name: t('app.rx.p.approval'), value: hours(stats.approvalMedianH), note: t('app.rx.p.approvalNote', { p90: hours(stats.approvalP90H), n: stats.approvals }) },
    { key: 'confirm', name: t('app.rx.p.confirm'), value: stats.confirmMedianMs === null ? '—' : seconds(stats.confirmMedianMs, locale), note: t('app.rx.p.confirmNote') },
  ]
  const counts = [
    { key: 'auto', name: t('app.rx.p.auto'), value: stats.autoApproved },
    { key: 'review', name: t('app.rx.p.review'), value: stats.reviews, bad: stats.reviews > 0 },
    { key: 'rejected', name: t('app.rx.p.rejected'), value: stats.rejected },
    { key: 'cancelled', name: t('app.rx.p.cancelled'), value: stats.cancelled },
  ]
  return (
    <Panel aria-labelledby="rx-proc">
      <PanelHead id="rx-proc" title={t('app.rx.p')} meta={t('app.rx.p.meta')} />
      <dl className="grid grid-cols-1 gap-px bg-hair sm:grid-cols-2">
        {big.map((b) => (
          <div key={b.key} className="bg-sheet px-5 py-4">
            <dt className={label}>{b.name}</dt>
            <dd className={`${figure} mt-1.5 text-[28px] leading-none text-ink`}>{b.value}</dd>
            <dd className="mt-1.5 text-[12.5px] text-muted">{b.note}</dd>
          </div>
        ))}
      </dl>
      <dl className="divide-y divide-hair border-t border-hair">
        {counts.map((c) => (
          <div key={c.key} className="flex items-baseline justify-between gap-4 px-5 py-2.5 text-[14px]">
            <dt className="text-muted">{c.name}</dt>
            <dd className={c.bad ? 'font-medium tabular-nums text-bad-ink' : 'tabular-nums text-ink'}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
