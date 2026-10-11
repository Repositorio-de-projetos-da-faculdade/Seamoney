'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { DemoState, Member } from '@/lib/demo/types'
import { PersonaCard } from './PersonaCard'
import { PortClock } from './PortClock'
import { REVEAL } from './reveal'
import { SettlementLine } from './SettlementLine'

/**
 * The foot of the column: an optional extra row (the phone drawer's language switch), the port clocks and the
 * settlement line above a hairline, then the person at the desk. On the rail only the person's initials show.
 */
export function SidebarFooter({ state, me, footer }: { state: DemoState; me: Member; footer?: ReactNode }) {
  return (
    <div className="space-y-4">
      {footer ? <div className={clsx('pl-6', REVEAL)}>{footer}</div> : null}
      <div className={clsx('w-[248px] space-y-3 border-t border-foam/10 px-6 pt-4 group-data-[drawer=true]/side:w-auto', REVEAL)}>
        <PortClock />
        <SettlementLine state={state} />
      </div>
      <PersonaCard state={state} me={me} />
    </div>
  )
}
