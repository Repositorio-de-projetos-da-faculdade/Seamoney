'use client'

import type { ReactNode } from 'react'
import { brl, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'
import { total } from '@/lib/demo/reportData'
import { Simulated } from '../kit/Status'
import { figure, label } from '../kit/styles'
import { changeText } from './StatementHeader'

function Cell({ name, value, note }: { name: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0 bg-sheet px-5 py-4">
      <dt className={label}>{name}</dt>
      <dd className={`${figure} mt-1.5 truncate text-[26px] leading-none text-ink`}>{value}</dd>
      {note ? <dd className="mt-1.5 text-[12.5px] leading-snug text-muted">{note}</dd> : null}
    </div>
  )
}

/** The rest of the money in one row: what Seamoney charged, what the route saved (estimate) and the reais side (simulated). */
export function KpiStrip({ paid, prev, span, bankPct, fxRate, reconciledShare }: { paid: Payment[]; prev: Payment[]; span: string | null; bankPct: number; fxRate: number; reconciledShare: number | null }) {
  const { t, locale } = useT()
  const fees = total(paid, (p) => p.quote.feeCents)
  return (
    <dl className="grid grid-cols-1 gap-px border border-rule bg-hair sm:grid-cols-2 xl:grid-cols-4">
      <Cell name={t('app.rep.fees')} value={usd(fees, locale)} note={changeText(fees, total(prev, (p) => p.quote.feeCents), span, t) ?? t('app.rx.fees.note')} />
      <Cell name={t('app.rep.savings')} value={usd(total(paid, (p) => p.quote.savingsCents), locale)} note={t('app.rep.estimate', { pct: bankPct })} />
      <Cell
        name={t('app.rep.brl')}
        value={brl(total(paid, (p) => p.quote.totalBrlCents), locale)}
        note={<Simulated>{t('app.rep.brl.note', { rate: fxRate })}</Simulated>}
      />
      <Cell
        name={t('app.rx.recon')}
        value={reconciledShare === null ? '—' : `${Math.round(reconciledShare * 100)}%`}
        note={t('app.rx.recon.note')}
      />
    </dl>
  )
}
