'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui'
import { useT } from '@/lib/i18n/client'
import { demo, useDemoState } from '@/lib/demo/store'
import { Rich } from '../kit/Rich'
import { Simulated } from '../kit/Status'
import { display } from '../kit/styles'
import { LangSwitch } from '../shell/LangSwitch'
import { MemberRow } from './MemberRow'
import { SeaChart } from './SeaChart'
import { TaskLine } from './TaskLine'
import { TrySteps } from './TrySteps'

/** The door of the demo: pick who sits at the desk. No password; everything lives in this browser. */
export function LoginScreen() {
  const { t } = useT()
  const router = useRouter()
  const state = useDemoState()

  const pick = (id: string) => {
    demo.signIn(id)
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

        <ul className="mt-10 border-t border-foam/10 md:mt-12">
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
