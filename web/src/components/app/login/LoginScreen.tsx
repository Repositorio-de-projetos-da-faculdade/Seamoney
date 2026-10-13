'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui'
import { useT } from '@/lib/i18n/client'
import { signOutLive } from '@/lib/demo/backend'
import { liveAvailable } from '@/lib/demo/settle'
import { demo, useDemoState } from '@/lib/demo/store'
import { Rich } from '../kit/Rich'
import { Simulated } from '../kit/Status'
import { display } from '../kit/styles'
import { LangSwitch } from '../shell/LangSwitch'
import { LiveSignIn } from './LiveSignIn'
import { MemberRow } from './MemberRow'
import { SeaChart } from './SeaChart'
import { TaskLine } from './TaskLine'
import { TrySteps } from './TrySteps'

/**
 * The door of the workspace. With the Docker stack up, a real sign-in with the rules service comes first and payments
 * settle on the Tempo testnet; below it (or alone, without a backend) the offline demo: pick who sits at the desk.
 */
export function LoginScreen() {
  const { t } = useT()
  const router = useRouter()
  const state = useDemoState()
  // null while the stack is being asked, so the screen does not show one layout and then jump to another
  const [live, setLive] = useState<boolean | null>(null)
  useEffect(() => {
    void liveAvailable().then((a) => setLive(a !== 'no'))
  }, [])

  // picking a person here is the offline demo: any real session is closed and settlement goes back to simulated
  const pick = (id: string) => {
    if (live) void signOutLive()
    demo.signInOffline(id)
    router.push('/app')
  }

  // the offline demo: who sits at the desk, and the three guided steps (signing in as those same people)
  const offline = (listClass: string) =>
    state ? (
      <>
        <ul className={listClass}>
          {state.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              roleName={t(`app.role.${m.role}`)}
              does={t(`app.role.${m.role}.does`)}
              summary={m.status !== 'invited' ? <TaskLine state={state} member={m} /> : null}
              enterLabel={t('app.login.enter', { name: m.name })}
              invitedLabel={t('app.login.invited')}
              onPick={pick}
            />
          ))}
        </ul>
        <div className="mt-12">
          <TrySteps state={state} />
        </div>
      </>
    ) : null

  return (
    <main id="main" className="flex min-h-dvh flex-col bg-abyss text-foam md:grid md:grid-cols-[minmax(0,45%)_minmax(0,1fr)]">
      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col px-5 pb-10 pt-8 sm:px-8 md:mx-0 md:max-w-none md:pt-12 lg:pl-12 lg:pr-10">
        <header>
          <Logo tone="onDark" height={28} />
        </header>

        <div className="mt-14 md:mt-16">
          <h1 className={`${display} !text-white text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.98]`}>
            <Rich text={t('app.login.title')} />
          </h1>
          <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-[1.6] text-foam/70">{t('app.login.lede')}</p>
        </div>

        {live === null ? <p className="mt-10 text-[14px] text-foam/55 md:mt-12">{t('app.live.checking')}</p> : null}

        {live ? (
          // With the stack up, the real sign-in is the way in. Its four accounts are the same four roles as the offline
          // people below, so those stay folded away instead of listing every role a second time.
          <div className="mt-10 md:mt-12">
            <LiveSignIn />
            {state ? (
              <details className="group mt-8 border-t border-foam/10 pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[3px] py-2 text-[14px] font-medium text-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint [&::-webkit-details-marker]:hidden">
                  <span>{t('app.live.offline.open')}</span>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180">
                    <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-foam/60">{t('app.live.offline')}</p>
                {offline('mt-4 border-t border-foam/10')}
              </details>
            ) : null}
          </div>
        ) : null}

        {live === false ? offline('mt-10 border-t border-foam/10 md:mt-12') : null}

        <footer className="mt-auto flex flex-col gap-5 pt-12">
          {/* with the real sign-in the form's own text already says the exchange is simulated and that these are test networks */}
          {live ? null : <Simulated onNight>{t('app.login.note')}</Simulated>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <LangSwitch onNight />
            <Link
              href="/"
              prefetch={false}
              className="text-[14px] font-medium text-foam underline decoration-foam/30 underline-offset-[4px] transition-colors hover:decoration-foam"
            >
              {t('app.nav.site')}
            </Link>
          </div>
        </footer>
      </div>

      {state ? (
        <aside aria-label={t('app.login2.chart.title')} className="max-md:hidden md:sticky md:top-0 md:h-dvh border-l border-foam/10">
          <SeaChart state={state} />
        </aside>
      ) : null}
    </main>
  )
}
