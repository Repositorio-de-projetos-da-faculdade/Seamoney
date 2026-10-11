'use client'

import clsx from 'clsx'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n/client'
import { roleCan } from '@/lib/demo/rules'
import type { DemoState, Member } from '@/lib/demo/types'
import { Logo, LogoMark } from '../../ui'
import { CompanyBlock } from './CompanyBlock'
import { NavList } from './NavList'
import { COLUMN_WIDTH, EASE, RAIL_ONLY, REVEAL, SIDE_GROUP } from './reveal'
import { SidebarFooter } from './SidebarFooter'
import { NewPaymentButton } from './SidebarControls'

type PanelProps = {
  state: DemoState
  me: Member
  onNavigate?: () => void
  footer?: ReactNode
}

/** The brand at the top: the mark alone on the rail, crossfading into the full logo when the column opens. */
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/app" onClick={onNavigate} aria-label="Seamoney" className="relative block h-[26px] pl-[23px]">
      <span className={clsx('absolute left-[23px] top-0', RAIL_ONLY)} aria-hidden="true">
        <LogoMark size={26} />
      </span>
      <span className={clsx('block', REVEAL)} aria-hidden="true">
        <Logo height={26} />
      </span>
    </Link>
  )
}

/**
 * The column's content, the same for the desktop rail and the phone drawer: brand and company, the links, the one
 * action under them, then the clocks, settlement and the person at the foot.
 */
function SidebarPanel({ state, me, onNavigate, footer }: PanelProps) {
  const { t } = useT()
  return (
    <div className="flex min-h-full flex-col gap-8 pb-5 pt-6">
      <div className="space-y-7">
        <Brand onNavigate={onNavigate} />
        <CompanyBlock name={state.settings.companyName} />
      </div>

      <div>
        <NavList state={state} me={me} onNavigate={onNavigate} />
        {roleCan(me.role, 'create_payment') ? (
          <div className="mt-6">
            <NewPaymentButton label={t('app.nav.new')} onNavigate={onNavigate} />
          </div>
        ) : null}
      </div>

      <div className="mt-auto">
        <SidebarFooter state={state} me={me} footer={footer} />
      </div>
    </div>
  )
}

/** The phone drawer's content: always open, at the drawer's full width. */
export function SidebarBody({ state, me, onNavigate, footer }: { state: DemoState; me: Member; onNavigate?: () => void; footer?: ReactNode }) {
  return (
    <div data-drawer="true" className={clsx(SIDE_GROUP, 'h-full overflow-y-auto')}>
      <SidebarPanel state={state} me={me} onNavigate={onNavigate} footer={footer} />
    </div>
  )
}

/**
 * Desktop column. It keeps a 72px rail in the page layout and opens to 248px over the content while the pointer is on
 * it (or keyboard focus is inside, or the person menu is open), so the page never shifts. One soft curve drives the
 * width; the words fade in after it, and fade out first when it closes.
 */
export function Sidebar({ state, me }: { state: DemoState; me: Member }) {
  return (
    <div className="sticky top-0 z-50 hidden h-dvh w-[72px] shrink-0 lg:block print:hidden">
      <aside
        className={clsx(
          SIDE_GROUP,
          COLUMN_WIDTH,
          EASE,
          'absolute inset-y-0 left-0 overflow-y-auto overflow-x-hidden bg-night text-foam transition-[width,box-shadow] [scrollbar-width:none] hover:shadow-[28px_0_60px_-34px_rgb(2_8_16/0.75)] has-[[aria-expanded=true]]:shadow-[28px_0_60px_-34px_rgb(2_8_16/0.75)] [&::-webkit-scrollbar]:hidden',
        )}
      >
        <SidebarPanel state={state} me={me} />
      </aside>
    </div>
  )
}
