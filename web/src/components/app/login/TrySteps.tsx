'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { demo } from '@/lib/demo/store'
import type { DemoState } from '@/lib/demo/types'
import { btnGo, display, label } from '../kit/styles'

const STEPS = [
  { memberId: 'mem_julia', href: '/app/payments/new', line: 'app.login2.try.1' },
  { memberId: 'mem_rafael', href: '/app/payments?view=mine', line: 'app.login2.try.2' },
  { memberId: 'mem_carlos', href: '/app/reports', line: 'app.login2.try.3' },
] as const

/** Three guided steps: each button signs in as one person and opens the screen for that part of the flow. */
export function TrySteps({ state }: { state: DemoState }) {
  const { t } = useT()
  const router = useRouter()

  const go = (memberId: string, href: string) => {
    demo.signIn(memberId)
    router.push(href)
  }

  return (
    <section aria-labelledby="try-title" className="border-t border-foam/10 pt-8">
      <h2 id="try-title" className={`${display} !text-white text-[1.75rem] leading-[1.05]`}>
        {t('app.login2.try.title')}
      </h2>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-foam/60">{t('app.login2.try.lede')}</p>
      <ol className="mt-6 grid gap-5">
        {STEPS.map((step, i) => {
          const member = state.members.find((m) => m.id === step.memberId)
          return (
            <li key={step.memberId} className="grid min-w-0 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className={clsx(label, '!text-foam/50')}>{t('app.login2.try.step', { n: i + 1 })}</p>
                <p className="mt-1 text-[15px] leading-snug text-foam/85">{t(step.line, { name: member?.name ?? '' })}</p>
              </div>
              {member ? (
                <button type="button" onClick={() => go(step.memberId, step.href)} className={clsx(btnGo, 'justify-self-start sm:justify-self-end')}>
                  {t('app.login2.try.go', { name: member.name })}
                </button>
              ) : (
                <p className="text-[13px] text-foam/50">{t('app.login2.try.unavailable')}</p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
