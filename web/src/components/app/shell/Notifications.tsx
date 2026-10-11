'use client'

import clsx from 'clsx'
import { Bell } from 'iconoir-react'
import { useT } from '@/lib/i18n/client'
import { notificationsFor } from '@/lib/demo/selectors'
import { demo } from '@/lib/demo/store'
import type { DemoState, Member } from '@/lib/demo/types'
import { usePopover } from '../kit/usePopover'
import { LogEntry } from '../log/LogEntry'

export function Notifications({ state, me, onNight = false }: { state: DemoState; me: Member; onNight?: boolean }) {
  const { t } = useT()
  const { open, setOpen, root, trigger } = usePopover()
  const items = notificationsFor(state, me)
  const unread = items.filter((a) => a.at > state.readAt).length

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('app.notif.open', { n: unread })}
        onClick={() => setOpen(!open)}
        className={clsx(
          'relative grid size-10 place-items-center rounded-full transition-colors',
          onNight ? 'text-foam/75 hover:bg-foam/[0.08] hover:text-white' : 'text-ink/70 hover:bg-ink/[0.05] hover:text-ink',
        )}
      >
        <Bell width={18} height={18} aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 font-data text-[10px] font-medium text-white">{unread > 9 ? '9+' : unread}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(400px,calc(100vw-1.5rem))] border border-rule bg-sheet text-ink shadow-[0_30px_60px_-24px_rgb(6_24_44/0.5)]">
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <h2 className="font-grotesk text-[16px] font-medium tracking-[-0.015em]">{t('app.notif.title')}</h2>
            {unread > 0 ? (
              <button type="button" onClick={() => demo.markRead()} className="text-[13px] text-muted underline decoration-ink/20 underline-offset-4 hover:text-ink">
                {t('app.notif.read')}
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-muted">{t('app.notif.empty')}</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-hair overflow-y-auto px-4">
              {items.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <LogEntry state={state} activity={a} unread={a.at > state.readAt} onNavigate={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
