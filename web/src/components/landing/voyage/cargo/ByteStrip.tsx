import clsx from 'clsx'
import type { Memo } from '@/lib/memo'

/** The 32 bytes of the memo as a ruled strip, each cell lit as its container lands: reference in mint, padding dim. */
export function ByteStrip({ memo, landed }: { memo: Memo; landed: number }) {
  return (
    <ol className="grid grid-cols-16 gap-x-0.5 gap-y-2 md:grid-cols-[repeat(32,minmax(0,1fr))] md:gap-x-1" aria-hidden="true">
      {memo.bytes.map((b, i) => {
        const on = i < landed
        return (
          <li
            key={i}
            className={clsx(
              'border-t pt-1.5 text-center font-data text-[9px] font-medium uppercase transition-colors duration-500 md:pt-2 md:text-[11px]',
              !on && 'border-foam/10 text-foam/15',
              on && !b.padding && 'border-mint text-mint',
              on && b.padding && 'border-foam/35 text-foam/40',
            )}
          >
            {b.hex}
          </li>
        )
      })}
    </ol>
  )
}
