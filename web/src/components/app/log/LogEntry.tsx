'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { dateTime, relative } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Activity, DemoState } from '@/lib/demo/types'
import { useActivitySubject, useActivityText } from './activity'

/**
 * One line of the audit trail: what happened, about what (a link), and when. Inside a payment's own page the subject
 * is left out (`bare`), since it is the page itself.
 */
export function LogEntry({
  state,
  activity,
  unread = false,
  bare = false,
  onNavigate,
}: {
  state: DemoState
  activity: Activity
  unread?: boolean
  bare?: boolean
  onNavigate?: () => void
}) {
  const { locale } = useT()
  const text = useActivityText()(state, activity)
  const subjectOf = useActivitySubject()
  const subject = bare ? null : subjectOf(state, activity)
  return (
    <div className="flex gap-3 py-2.5">
      <span className={clsx('mt-[7px] size-[6px] shrink-0 rounded-full', unread ? 'bg-brand-600' : activity.actorId ? 'bg-ink/30' : 'bg-mint')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={clsx('text-[14px] leading-snug', unread ? 'font-medium text-ink' : 'text-ink/85')}>{text}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12.5px] text-muted">
          <time dateTime={activity.at} title={dateTime(activity.at, locale)}>
            {relative(activity.at, locale)}
          </time>
          {subject ? (
            <Link href={subject.href} onClick={onNavigate} className="min-w-0 truncate underline decoration-ink/20 underline-offset-[3px] hover:text-ink hover:decoration-ink">
              {subject.text}
            </Link>
          ) : null}
        </p>
      </div>
    </div>
  )
}
