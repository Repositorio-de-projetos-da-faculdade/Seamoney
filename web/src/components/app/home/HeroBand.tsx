'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useState } from 'react'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { overviewStats } from '@/lib/demo/selectors'
import type { DemoState, PaymentStatus, Role } from '@/lib/demo/types'
import { NightChart } from '../chart/NightChart'
import { HULL } from '../chart/Vessel'
import { vesselsOf, VESSEL_COLOR } from '../chart/voyage'
import { btnGo } from '../kit/styles'

const STAGES: { status: PaymentStatus; view: string }[] = [
  { status: 'pending_approval', view: 'approval' },
  { status: 'approved', view: 'ready' },
  { status: 'sent', view: 'network' },
  { status: 'in_review', view: 'review' },
]

/** The one action each role starts from: the decision that most often waits for them. */
const PRIMARY: Record<Role, { href: string; key: 'app.home.go.approvals' | 'app.home.go.new' | 'app.home.go.reports' }> = {
  owner: { href: '/app/payments?view=mine', key: 'app.home.go.approvals' },
  approver: { href: '/app/payments?view=mine', key: 'app.home.go.approvals' },
  operator: { href: '/app/payments/new', key: 'app.home.go.new' },
  accountant: { href: '/app/reports', key: 'app.home.go.reports' },
}

/** The vessel symbol drawn on the chart, small, for the legend: the same shape and colour the map uses. */
function HullMark({ status }: { status: PaymentStatus }) {
  return (
    <svg viewBox="-9 -8 22 16" className="h-3 w-[18px] shrink-0" aria-hidden="true">
      <path d={HULL} fill={VESSEL_COLOR[status]} stroke="#020810" strokeWidth="1" />
    </svg>
  )
}

/**
 * The chart's title block, as printed charts have in a corner: what the chart shows, the open total, and the way in.
 * Over the chart on wide screens, above it on phones.
 */
function Cartouche({ state, role }: { state: DemoState; role: Role }) {
  const { t, locale } = useT()
  // only the open totals are read here, and they do not depend on the date
  const stats = overviewStats(state, 0)
  const primary = PRIMARY[role]
  return (
    <div className="bg-abyss/85 p-1 backdrop-blur-[3px] lg:border lg:border-foam/20">
      {/* the inner hairline of a chart cartouche's double frame */}
      <div className="p-5 lg:border lg:border-foam/10">
        <p className="font-data text-[10px] uppercase tracking-[0.12em] text-mint">{t('app.home.sea.kicker')}</p>
        <h2 id="home-sea" className="mt-2 font-grotesk text-[26px] font-light leading-none tracking-[-0.025em] text-white">
          {t('app.home.sea')}
        </h2>
        <p className="mt-2.5 max-w-[30ch] text-[13.5px] leading-relaxed text-foam/65">
          {t('app.home.sea.summary', { n: stats.openCount, amount: usd(stats.openCents, locale) })}
        </p>
        <Link href={primary.href} className={clsx(btnGo, 'mt-5')}>
          {t(primary.key)}
        </Link>
      </div>
    </div>
  )
}

/** The legend under the chart: each stage with the vessel symbol that marks it on the map, its count, and its queue. */
function Legend({ state }: { state: DemoState }) {
  const { t } = useT()
  const count = (s: PaymentStatus) => state.payments.filter((p) => p.status === s || (s === 'sent' && p.status === 'sending')).length
  return (
    <div className="flex flex-col gap-3 border-t border-foam/10 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <ul aria-label={t('app.home.sea.legend')} className="grid grid-cols-1 sm:flex sm:flex-wrap sm:gap-x-8">
        {STAGES.map((s) => (
          <li key={s.status}>
            <Link href={`/app/payments?view=${s.view}`} className="group flex items-center gap-2.5 py-1.5 text-[13px] text-foam/60 transition-colors hover:text-white">
              <HullMark status={s.status} />
              <span>{t(`app.status.${s.status}`)}</span>
              <span className="font-grotesk text-[18px] font-light tabular-nums text-white">{count(s.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[12.5px] text-foam/45">{t('app.home.seaMeta')}</p>
    </div>
  )
}

/**
 * The memorable part of the home page, in the landing's night: the chart from Santos to the suppliers' ports runs the
 * full width, each open payment a vessel at its stage. Its title block sits on the open water of the north-west
 * corner (Santos and the routes are lower down), and the legend underneath counts the vessels by stage.
 */
export function HeroBand({ state, role }: { state: DemoState; role: Role }) {
  const { t } = useT()
  const [selected, setSelected] = useState<string | null>(null)
  const vessels = vesselsOf(state)

  return (
    <section aria-labelledby="home-sea" className="overflow-hidden bg-abyss text-foam">
      <div className="lg:hidden">
        <Cartouche state={state} role={role} />
      </div>
      <div className="relative">
        <NightChart
          vessels={vessels}
          selected={selected}
          onSelect={setSelected}
          title={t('app.home.seaChart', { n: vessels.length })}
          cover
          labels
          className="aspect-[1600/755] lg:aspect-auto lg:h-[440px] xl:h-[500px]"
        />
        <div className="absolute left-6 top-8 hidden w-[290px] lg:block">
          <Cartouche state={state} role={role} />
        </div>
      </div>
      <Legend state={state} />
    </section>
  )
}
