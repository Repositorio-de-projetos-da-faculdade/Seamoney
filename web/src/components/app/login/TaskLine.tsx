'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { tasksFor } from '@/lib/demo/selectors'
import type { DemoState, Member } from '@/lib/demo/types'
import { label } from '../kit/styles'

/** How much a person has waiting: a count of things to do, or a note for the accountant, who acts on nothing. */
export function TaskLine({ state, member }: { state: DemoState; member: Member }) {
  const { t } = useT()
  if (member.role === 'accountant') {
    return <span className={clsx(label, '!text-foam/50')}>{t('app.login2.reports')}</span>
  }
  const count = tasksFor(state, member).length
  if (count === 0) return <span className={clsx(label, '!text-foam/40')}>{t('app.login2.nothing')}</span>
  const text = count === 1 ? t('app.login2.todoOne') : t('app.login2.todoMany', { n: count })
  return <span className={clsx(label, '!text-mint')}>{text}</span>
}
