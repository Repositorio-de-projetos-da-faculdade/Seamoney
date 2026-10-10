import clsx from 'clsx'
import { Check } from 'lucide-react'
import { mono } from '../type'

export type Status = 'real' | 'sim'

/**
 * The customs stamp at the end of a declaration line: mint with a check for what runs for real, amber with a diamond
 * for anything simulated, estimated or missing. Lands with a thump on scroll (Declaration.tsx).
 */
export function StatusStamp({ status, text, className }: { status: Status; text: string; className?: string }) {
  const real = status === 'real'
  return (
    <span
      data-stamp
      className={clsx(
        mono,
        'inline-flex -rotate-3 items-center gap-1.5 whitespace-nowrap border px-2 py-1 uppercase tracking-[0.14em]',
        real ? 'border-mint/60 text-mint' : 'border-signal/70 text-signal',
        className,
      )}
    >
      {real ? <Check aria-hidden="true" className="size-3" strokeWidth={2.5} /> : <span aria-hidden="true" className="size-1.5 rotate-45 bg-signal" />}
      {text}
    </span>
  )
}
