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
  const [live, setLive] = useState(false)
  useEffect(() => {
    void liveAvailable().then((a) => setLive(a !== 'no'))
  }, [])

  // picking a person here is the offline demo: any real session is closed and settlement goes back to simulated
  const pick = (id: string) => {
    if (live) void signOutLive()
    demo.signInOffline(id)
    router.push('/app')
  }

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

        {live ? (
          <div className="mt-10 md:mt-12">
            <LiveSignIn />
            <p className="mt-8 max-w-[52ch] text-[14px] leading-relaxed text-foam/60">{t('app.live.offline')}</p>
          </div>
        ) : null}

        <ul className={live ? 'mt-4 border-t border-foam/10' : 'mt-10 border-t border-foam/10 md:mt-12'}>
          {state
            ? state.members.map((m) => (
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
              ))
            : null}
        </ul>

        {state ? (
          <div className="mt-12">
            <TrySteps state={state} />
          </div>
        ) : null}

        <footer className="mt-auto flex flex-col gap-5 pt-12">
          <Simulated onNight>{t('app.login.note')}</Simulated>
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
