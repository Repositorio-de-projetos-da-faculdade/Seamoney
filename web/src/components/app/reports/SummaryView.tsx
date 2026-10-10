'use client'

import { Download, Printer } from 'iconoir-react'
import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { orList } from '@/lib/list'
import { downloadText, paymentsCsv } from '@/lib/demo/csv'
import { monthsOf, monthStacks, paidInMonths, previousMonths, processStats, supplierShares, type NetworkFilter, type PeriodKey } from '@/lib/demo/reportData'
import { roleCan } from '@/lib/demo/rules'
import type { DemoState, Member } from '@/lib/demo/types'
import { Note } from '../kit/Panel'
import { Segments } from '../kit/Segments'
import { btnLine, btnSmall } from '../kit/styles'
import { KpiStrip } from './KpiStrip'
import { PaidByMonth } from './PaidByMonth'
import { ProcessPanel } from './ProcessPanel'
import { SavingCurve } from './SavingCurve'
import { StatementHeader } from './StatementHeader'
import { StatementPanel } from './StatementPanel'
import { SupplierBars } from './SupplierBars'

const PERIODS: readonly PeriodKey[] = ['month', 'q', 'year', 'all']
const NETWORKS: readonly NetworkFilter[] = ['all', 'tempo', 'solana']

/**
 * The money report. One row of filters (period, network) scopes everything below: the statement head, the figures,
 * the two charts, who was paid, how the process ran and the month-by-month statement. CSV and print sit in the same row.
 */
export function SummaryView({ state, me }: { state: DemoState; me: Member }) {
  const { t, locale } = useT()
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [network, setNetwork] = useState<NetworkFilter>('all')
  const [nowMs] = useState(() => Date.now())

  const months = monthsOf(state, period, nowMs)
  const paid = paidInMonths(state, months, network)
  const prev = paidInMonths(state, previousMonths(months, period), network)
  const stacks = monthStacks(paid, months)
  const stats = processStats(state, months, network, paid)
  const span = period === 'all' ? null : t(`app.rep.span.${period}`)
  const { settings } = state
  const canExport = roleCan(me.role, 'export')
  const exporters = state.members.filter((m) => m.status === 'active' && roleCan(m.role, 'export')).map((m) => m.name)
  const download = () => downloadText(`seamoney-payments-${new Date(nowMs).toISOString().slice(0, 10)}.csv`, paymentsCsv(state, paid))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 print:hidden">
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-6 gap-y-3">
          {/* the period tabs scroll sideways on a phone instead of widening the page */}
          <div className="min-w-0 max-w-full">
            <Segments label={t('app.rep.period')} value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: t(`app.rep.period.${p}`) }))} />
          </div>
          <div role="group" aria-label={t('app.rx.network')} className="flex h-9 items-center rounded-full border border-rule bg-white p-1 text-[13px]">
            {NETWORKS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={network === n}
                onClick={() => setNetwork(n)}
                className={network === n ? 'h-7 rounded-full bg-ink px-3 font-medium text-white' : 'h-7 rounded-full px-3 text-muted hover:text-ink'}
              >
                {n === 'all' ? t('app.rx.allNetworks') : t(`app.net.${n}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className={`${btnLine} ${btnSmall}`}>
            <Printer width={14} height={14} aria-hidden="true" />
            {t('app.rx.print')}
          </button>
          {canExport ? (
            <button type="button" onClick={download} disabled={paid.length === 0} className={`${btnLine} ${btnSmall}`}>
              <Download width={14} height={14} aria-hidden="true" />
              {t('app.rep.csv')}
            </button>
          ) : null}
        </div>
      </div>

      <StatementHeader company={settings.companyName} months={months} paid={paid} prev={prev} span={span} feeBps={settings.feeBps} bankPct={settings.bankFeePct} />
      <KpiStrip paid={paid} prev={prev} span={span} bankPct={settings.bankFeePct} fxRate={settings.fxRate} reconciledShare={stats.reconciledShare} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <PaidByMonth stacks={stacks} />
        <SavingCurve stacks={stacks} bankPct={settings.bankFeePct} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <SupplierBars shares={supplierShares(state, paid)} />
        <ProcessPanel stats={stats} />
      </div>

      <StatementPanel paid={paid} />
      <div className="print:hidden">
        {canExport ? (
          <Note tone="info">{t('app.rep.export.body')}</Note>
        ) : (
          <Note tone="info">{t('app.rep.export.who', { names: orList(exporters, locale) })}</Note>
        )}
      </div>
    </div>
  )
}
