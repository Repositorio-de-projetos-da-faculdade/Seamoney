'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useT } from '@/lib/i18n/client'
import { useDemoState, useMe } from '@/lib/demo/store'
import { LogoMark } from '../../ui'
import { Rich } from '../kit/Rich'
import { display } from '../kit/styles'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function DeskLoading() {
  const { t } = useT()
  return (
    <div className="grid min-h-dvh place-items-center bg-abyss text-foam">
      <div className="flex flex-col items-center gap-4">
        <span className="animate-pulse">
          <LogoMark size={40} />
        </span>
        <p className="text-[13px] text-foam/60">{t('app.loading')}</p>
      </div>
    </div>
  )
}

/** Everything inside the workspace needs a signed-in person; without one, go pick a persona. */
export function DeskShell({ children }: { children: ReactNode }) {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  const router = useRouter()

  useEffect(() => {
    if (state && !me) router.replace('/app/login')
  }, [state, me, router])

  if (!state || !me) return <DeskLoading />

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-sheet focus:px-4 focus:py-3 focus:font-medium focus:text-ink"
      >
        {t('app.skip')}
      </a>
      <Sidebar state={state} me={me} />
      <div className="min-w-0 flex-1">
        <TopBar state={state} me={me} />
        <main id="main" className="pb-24">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * Standard page body: title (with *starred* words in the italic serif), one line saying what this page is for, the
 * page's main actions on the right.
 */
export function Page({
  title,
  lede,
  actions,
  crumb,
  children,
  width = 'wide',
}: {
  title: string
  lede?: ReactNode
  actions?: ReactNode
  crumb?: ReactNode
  children: ReactNode
  width?: 'wide' | 'narrow'
}) {
  return (
    <div className={clsx('px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9', width === 'narrow' ? 'max-w-5xl' : 'w-full')}>
      {crumb ? <div className="mb-4 text-[13px] text-muted">{crumb}</div> : null}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className={clsx(display, 'text-[34px] leading-[1.02] sm:text-[42px]')}>
            <Rich text={title} />
          </h1>
          {lede ? <div className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-muted">{lede}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </header>
      {children}
    </div>
  )
}
