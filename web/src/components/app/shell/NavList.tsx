'use client'

import clsx from 'clsx'
import { DataTransferBoth, Group, HomeSimple, Packages, Settings, StatsReport } from 'iconoir-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType, SVGProps } from 'react'
import { useT } from '@/lib/i18n/client'
import { tasksFor } from '@/lib/demo/selectors'
import type { DemoState, Member } from '@/lib/demo/types'
import { COMPANY, isActive, WORK, type NavItem } from './nav'
import { RAIL_ONLY, REVEAL } from './reveal'

/** One icon per link, keyed by href so nav.ts stays free of view code. */
const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  '/app': HomeSimple,
  '/app/payments': DataTransferBoth,
  '/app/suppliers': Packages,
  '/app/reports': StatsReport,
  '/app/team': Group,
  '/app/settings': Settings,
}

const FOCUS = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint'
/** Height of one link and of the group label between the two lists, in px. The marker's position depends on both. */
const ROW = 40
const GROUP_LABEL = 44

/** Top edge of a row inside the nav, counting the group label that sits between the two lists. */
function rowTop(index: number, workCount: number) {
  return index < workCount ? index * ROW : workCount * ROW + GROUP_LABEL + (index - workCount) * ROW
}

/** The diamond on the track that marks the current page, as on the landing's chapter rail. It glides between rows. */
function TrackMarker({ top }: { top: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-[11px] size-[7px] rotate-45 border border-mint bg-night transition-[top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{ top: top + ROW / 2 - 3.5 }}
    />
  )
}

/**
 * The sidebar links on a vertical hairline, with how many things wait for this person in each place. Icons sit in a
 * fixed column centred on the 72px rail; the words and counts fade in when the column opens, a dot stands for the
 * count while it is closed.
 */
export function NavList({ state, me, onNavigate }: { state: DemoState; me: Member; onNavigate?: () => void }) {
  const { t } = useT()
  const pathname = usePathname()
  const tasks = tasksFor(state, me)
  const counts = {
    payments: tasks.filter((x) => x.kind !== 'wallet').length,
    suppliers: tasks.filter((x) => x.kind === 'wallet').length,
  }
  const activeIndex = [...WORK, ...COMPANY].findIndex((n) => isActive(pathname, n.href))

  const item = (n: NavItem) => {
    const on = isActive(pathname, n.href)
    const count = n.count ? counts[n.count] : 0
    const Icon = ICONS[n.href]
    const label = t(n.key)
    return (
      <li key={n.href}>
        <Link
          href={n.href}
          onClick={onNavigate}
          aria-current={on ? 'page' : undefined}
          aria-label={count > 0 ? `${label}, ${count}` : undefined}
          className={clsx('relative flex h-10 items-center pl-6 text-[14.5px] transition-colors', FOCUS, on ? 'text-white' : 'text-foam/60 hover:text-foam')}
        >
          <span className={clsx('relative grid w-6 shrink-0 place-items-center', on ? 'text-mint' : 'text-foam/40')} aria-hidden="true">
            {Icon ? <Icon width={18} height={18} strokeWidth={1.5} /> : null}
            {count > 0 ? <span className={clsx('absolute -right-1 -top-0.5 size-1.5 rounded-full bg-mint', RAIL_ONLY)} /> : null}
          </span>
          <span className={clsx('ml-3 whitespace-nowrap', REVEAL)}>{label}</span>
          {count > 0 ? <span className={clsx('ml-auto mr-5 font-data text-[12px] tabular-nums text-mint', REVEAL)}>{count}</span> : null}
        </Link>
      </li>
    )
  }

  return (
    <nav aria-label={t('app.nav.label')} className="relative">
      <span aria-hidden="true" className="absolute bottom-0 left-[14px] top-0 w-px bg-foam/12" />
      {activeIndex < 0 ? null : <TrackMarker top={rowTop(activeIndex, WORK.length)} />}
      <ul>{WORK.map(item)}</ul>
      {/* the group label in the landing's chapter-tag style: name, then a short rule */}
      <p className={clsx('flex h-11 items-end gap-3 whitespace-nowrap pb-2 pl-[60px] font-data text-[10px] uppercase tracking-[0.12em] text-foam/40', REVEAL)}>
        {t('app.nav.company')}
        <span className="mb-[5px] h-px w-6 bg-current opacity-50" aria-hidden="true" />
      </p>
      <ul>{COMPANY.map(item)}</ul>
    </nav>
  )
}
