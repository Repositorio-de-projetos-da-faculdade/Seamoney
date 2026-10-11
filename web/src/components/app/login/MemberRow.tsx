import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { Initials } from '../kit/Initials'
import { label } from '../kit/styles'
import type { Member } from '@/lib/demo/types'

/** One person on the login list: a large row that signs in, or a greyed one for someone invited who has not joined. */
export function MemberRow({
  member,
  roleName,
  does,
  summary,
  enterLabel,
  invitedLabel,
  onPick,
}: {
  member: Member
  roleName: string
  does: string
  summary: ReactNode
  enterLabel: string
  invitedLabel: string
  onPick: (id: string) => void
}) {
  const invited = member.status === 'invited'
  const body = (
    <>
      <Initials member={member} size={44} onNight />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-grotesk text-[19px] tracking-[-0.02em] text-white">{member.name}</span>
          <span className={clsx(label, invited ? '!text-foam/40' : '!text-mint')}>{roleName}</span>
        </span>
        <span className="mt-1 block text-[14px] leading-snug text-foam/60">{invited ? invitedLabel : does}</span>
        {invited ? null : <span className="mt-2 block">{summary}</span>}
      </span>
      {invited ? null : <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-foam/40 transition-transform group-hover:translate-x-1 group-hover:text-mint" />}
    </>
  )
  if (invited) return <li className="flex items-center gap-4 border-b border-foam/10 px-1 py-5 opacity-60">{body}</li>
  return (
    <li className="border-b border-foam/10">
      <button
        type="button"
        aria-label={enterLabel}
        onClick={() => onPick(member.id)}
        className="group flex w-full items-center gap-4 px-1 py-5 text-left transition-colors hover:bg-foam/[0.04] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-mint"
      >
        {body}
      </button>
    </li>
  )
}
