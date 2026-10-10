'use client'

import { seconds, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { approvalHours, monthPair } from '@/lib/demo/insights'
import { overviewStats } from '@/lib/demo/selectors'
import type { DemoState } from '@/lib/demo/types'
import { Panel, PanelHead } from '../kit/Panel'
import { figure, label } from '../kit/styles'

/** The month in four numbers, in one row: paid, open, how long approvals take, how fast the network confirms. Savings have their own chart below. */
export function Ledger({ state, now }: { state: DemoState; now: number }) {
  const { t, locale } = useT()
  const s = overviewStats(state, now)
  const pair = monthPair(state, now)
  const hours = approvalHours(state, now)

  const items = [
    {
      name: t('app.home.ledger.paid'),
      value: usd(pair.cents, locale),
      note: t('app.home.ledger.paidNote', { n: s.monthCount }),
      extra: t('app.home.ledger.prev', { amount: usd(pair.prevCents, locale) }),
    },
    { name: t('app.home.ledger.open'), value: usd(s.openCents, locale), note: t('app.home.ledger.openNote', { n: s.openCount }) },
    {
      name: t('app.home.ledger.approval'),
      value: hours === null ? t('app.home.ledger.none') : t('app.home.ledger.hours', { n: hours.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }),
      note: t('app.home.ledger.approvalNote'),
    },
    {
      name: t('app.home.ledger.confirm'),
      value: seconds(s.avgConfirmMs, locale),
      note: t('app.home.ledger.confirmNote', { n: s.paidCount }),
    },
  ]

  return (
    <Panel aria-labelledby="home-ledger">
      <PanelHead id="home-ledger" title={t('app.home.ledger')} />
      {/* hairlines between the figures come from the gap over the rule colour, so they hold when the row wraps */}
      <dl className="grid grid-cols-1 gap-px bg-hair sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.name} className="min-w-0 bg-sheet px-5 py-4">
            <dt className={label}>{i.name}</dt>
            <dd className={`${figure} mt-1.5 break-words text-[26px] leading-none text-ink`}>{i.value}</dd>
            <dd className="mt-1.5 text-[13px] text-muted">{i.note}</dd>
            {i.extra && <dd className="mt-1 text-[13px] text-muted">{i.extra}</dd>}
          </div>
        ))}
      </dl>
    </Panel>
  )
}
