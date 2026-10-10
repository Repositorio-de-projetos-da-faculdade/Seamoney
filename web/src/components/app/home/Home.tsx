'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useT } from '@/lib/i18n/client'
import { roleCan } from '@/lib/demo/rules'
import { useDemoState, useMe } from '@/lib/demo/store'
import type { DemoState, Member } from '@/lib/demo/types'
import { Panel, PanelHead } from '../kit/Panel'
import { textLink } from '../kit/styles'
import { LogEntry } from '../log/LogEntry'
import { Page } from '../shell/DeskShell'
import { Controls } from './Controls'
import { DueSoon } from './DueSoon'
import { HeroBand } from './HeroBand'
import { LatestSettlement } from './LatestSettlement'
import { Ledger } from './Ledger'
import { MoneyMap } from './MoneyMap'
import { SavingsChart } from './SavingsChart'
import { YourTurn } from './YourTurn'

function greeting(hour: number) {
  return hour < 12 ? 'app.home.morning' : hour < 18 ? 'app.home.afternoon' : 'app.home.evening'
}

/** The latest entries of the audit trail, with a way to the full trail when the role can see it. */
function ActivityPanel({ state, me }: { state: DemoState; me: Member }) {
  const { t } = useT()
  const recent = state.activity.slice(0, 7)
  return (
    <Panel aria-labelledby="home-log">
      <PanelHead
        id="home-log"
        title={t('app.home.log')}
        action={
          roleCan(me.role, 'view_audit') ? (
            <Link href="/app/reports?view=audit" className={`${textLink} text-[13.5px]`}>
              {t('app.viewAll')}
            </Link>
          ) : null
        }
      />
      <ul className="divide-y divide-hair px-5">
        {recent.map((a) => (
          <li key={a.id}>
            <LogEntry state={state} activity={a} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Two panels side by side on wide screens, stacked on phones. */
function Pair({ children, wide = 'left' }: { children: ReactNode; wide?: 'left' | 'even' }) {
  return <div className={clsx('grid grid-cols-1 gap-6 [&>*]:min-w-0', wide === 'even' ? 'lg:grid-cols-2' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]')}>{children}</div>
}

/**
 * Home, in reading order: the night chart with what is on its way, what waits for you next to what falls due, the
 * month in one row of figures, where the money goes, then controls, the latest settlement and the log. The accountant
 * comes for the numbers, so the figures and money rows move to the top.
 */
export function Home() {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  const [now] = useState(() => Date.now())
  if (!state || !me) return null

  const first = me.name.split(' ')[0]

  const work = (
    <Pair key="work">
      <YourTurn state={state} me={me} now={now} />
      <DueSoon state={state} now={now} />
    </Pair>
  )
  const numbers = [
    <Ledger key="ledger" state={state} now={now} />,
    <Pair key="money" wide="even">
      <SavingsChart state={state} now={now} />
      <MoneyMap state={state} now={now} />
    </Pair>,
  ]
  const record = (
    <Pair key="record">
      <ActivityPanel state={state} me={me} />
      <div className="min-w-0 space-y-6">
        <Controls state={state} />
        <LatestSettlement state={state} />
      </div>
    </Pair>
  )

  return (
    <Page
      title={t(greeting(new Date(now).getHours()), { name: first })}
      lede={`${t(`app.role.${me.role}`)}, ${state.settings.companyName}. ${t(`app.role.${me.role}.does`)}`}
    >
      <div className="space-y-6">
        {me.role === 'accountant' ? [...numbers, <HeroBand key="sea" state={state} role={me.role} />, work, record] : [<HeroBand key="sea" state={state} role={me.role} />, work, ...numbers, record]}
      </div>
    </Page>
  )
}
