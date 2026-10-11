import clsx from 'clsx'
import type { Member } from '@/lib/demo/types'

/** Initials in a small circle, to recognise a person in lists and the log. */
export function Initials({ member, size = 28, onNight = false, className }: { member: Pick<Member, 'name'>; size?: number; onNight?: boolean; className?: string }) {
  const parts = member.name.trim().split(/\s+/)
  const text = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center rounded-full font-grotesk font-medium tracking-[-0.02em]',
        onNight ? 'bg-foam/12 text-foam' : 'bg-ink/[0.07] text-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {text}
    </span>
  )
}
