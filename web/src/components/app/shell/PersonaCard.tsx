'use client'

import clsx from 'clsx'
import { LogOut, NavArrowDown, OpenNewWindow, Undo } from 'iconoir-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { signOutLive } from '@/lib/demo/backend'
import { demo } from '@/lib/demo/store'
import type { DemoState, Member } from '@/lib/demo/types'
import { Initials } from '../kit/Initials'
import { useToast } from '../kit/Toaster'
import { usePopover } from '../kit/usePopover'
import { REVEAL } from './reveal'

const ROW = 'flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left text-foam/75 hover:bg-foam/[0.06] hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint'

/**
 * Who is at the desk, at the foot of the sidebar. Opening it switches person (the heart of the demo: every role sees
 * different work), resets the data or leaves. On the rail only the initials show; the name fades in as the column opens.
 */
export function PersonaCard({ state, me }: { state: DemoState; me: Member }) {
  const { t } = useT()
  const toast = useToast()
  const router = useRouter()
  const { open, setOpen, root, trigger } = usePopover()
  const people = state.members.filter((m) => m.status === 'active')
  const role = t(`app.role.${me.role}`)

  return (
    <div ref={root} className="relative">
      {open ? (
        <div
          className="absolute bottom-full left-3 z-50 mb-2 w-[224px] border border-foam/12 bg-tide p-1.5 text-foam"
        >
          <p className="px-2.5 pb-1.5 pt-2 text-[12.5px] leading-snug text-foam/55">{t('app.persona.hint')}</p>
          <ul>
            {people.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-current={m.id === me.id}
                  onClick={() => {
                    setOpen(false)
                    if (m.id === me.id) return
                    demo.signIn(m.id)
                    toast.ok(t('app.persona.now', { name: m.name, role: t(`app.role.${m.role}`) }))
                  }}
                  className={clsx('flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left transition-colors hover:bg-foam/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint', m.id === me.id && 'bg-foam/[0.08]')}
                >
                  <Initials member={m} size={26} onNight />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-white">{m.name}</span>
                    <span className="block text-[12px] text-foam/55">{t(`app.role.${m.role}`)}</span>
                  </span>
                  {m.id === me.id ? <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" /> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 space-y-0.5 border-t border-foam/10 pt-1.5 text-[13.5px]">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                demo.reset()
                toast.ok(t('app.persona.resetDone'))
              }}
              className={ROW}
            >
              <Undo width={16} height={16} aria-hidden="true" />
              {t('app.persona.reset')}
            </button>
            <Link href="/" className={ROW}>
              <OpenNewWindow width={16} height={16} aria-hidden="true" />
              {t('app.nav.site')}
            </Link>
            <button
              type="button"
              onClick={() => {
                demo.signOut()
                void signOutLive()
                router.push('/app/login')
              }}
              className={ROW}
            >
              <LogOut width={16} height={16} aria-hidden="true" />
              {t('app.persona.signOut')}
            </button>
          </div>
        </div>
      ) : null}

      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t('app.persona.label')}: ${me.name}, ${role}. ${t('app.persona.switch')}`}
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-3 py-1 pl-[21px] text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint"
      >
        <Initials member={me} size={30} onNight />
        <span className={clsx('flex w-[170px] shrink-0 items-center gap-3', REVEAL)} aria-hidden="true">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] text-white">{me.name}</span>
            <span className="block text-[12px] text-mint">{role}</span>
          </span>
          <NavArrowDown width={15} height={15} className="shrink-0 text-foam/40 transition-colors group-hover:text-white" />
        </span>
      </button>
    </div>
  )
}
