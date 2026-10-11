'use client'

import { Menu, Xmark } from 'iconoir-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import type { DemoState, Member } from '@/lib/demo/types'
import { LogoMark } from '../../ui'
import { Live, Simulated } from '../kit/Status'
import { LangSwitch } from './LangSwitch'
import { Notifications } from './Notifications'
import { SidebarBody } from './Sidebar'

/** The honesty line, on every screen: what is simulated and how payments settle right now. */
function EnvLine({ state, onNight = false }: { state: DemoState; onNight?: boolean }) {
  const { t } = useT()
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
      <Simulated onNight={onNight}>{t('app.env.short')}</Simulated>
      {state.settings.settlementMode === 'testnet' ? <Live onNight={onNight}>{t('app.testnet')}</Live> : null}
    </p>
  )
}

/** Desktop: a slim strip over the page. Phone: the night bar with the menu, which opens the sidebar as a drawer. */
export function TopBar({ state, me }: { state: DemoState; me: Member }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = drawer.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <>
      <div className="hidden h-14 items-center justify-between gap-6 border-b border-rule px-10 lg:flex print:hidden">
        <EnvLine state={state} />
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Notifications state={state} me={me} />
        </div>
      </div>

      <div className="sticky top-0 z-40 bg-night text-foam lg:hidden print:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-3">
          <Link href="/app" className="flex items-center gap-2.5 px-1" aria-label="Seamoney">
            <LogoMark size={24} />
            <span className="max-w-[46vw] truncate font-grotesk text-[15px] tracking-[-0.02em] text-white">{state.settings.companyName}</span>
          </Link>
          <div className="flex items-center">
            <Notifications state={state} me={me} onNight />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t('app.nav.menu')}
              className="grid size-10 place-items-center rounded-full text-foam/80 hover:bg-foam/[0.08] hover:text-white"
            >
              <Menu width={20} height={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="border-t border-foam/10 bg-tide/60 px-4 py-2">
          <EnvLine state={state} onNight />
        </div>
      </div>

      <dialog
        ref={drawer}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
        aria-label={t('app.nav.menu')}
        className="m-0 ml-auto h-dvh max-h-none w-[min(320px,88vw)] bg-night p-0 text-foam backdrop:bg-abyss/70 lg:hidden"
      >
        {open ? (
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('app.close')}
              className="absolute right-3 top-4 z-10 grid size-10 place-items-center rounded-full text-foam/70 hover:bg-foam/[0.08] hover:text-white"
            >
              <Xmark width={18} height={18} aria-hidden="true" />
            </button>
            <SidebarBody state={state} me={me} onNavigate={() => setOpen(false)} footer={<LangSwitch onNight />} />
          </div>
        ) : null}
      </dialog>
    </>
  )
}
