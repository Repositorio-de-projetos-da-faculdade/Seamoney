import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { encodeMemo, memoHex } from '@/lib/memo'
import { SAMPLE_REFERENCE as REFERENCE } from './sample'
import { mono } from './type'

const RUN = [REFERENCE, memoHex(encodeMemo(REFERENCE)), 'TransferWithMemo', 'AlphaUSD · TIP-20', 'Tempo Moderato · 42431', 'Solana devnet · Memo program']

function Run() {
  return (
    <span className="flex shrink-0 items-center gap-10 pr-10">
      {RUN.map((item) => (
        <span key={item} className="flex items-center gap-10 whitespace-nowrap">
          {item}
          <span className="size-1 rotate-45 bg-mint/60" />
        </span>
      ))}
    </span>
  )
}

/**
 * A ticker tape of the sample memo, on the edge where the voyage hands over to the chart: two identical runs side
 * by side, the strip sliding by one run so the loop never shows a seam. Decorative; it stops for reduced motion.
 */
export function MemoTicker({ className }: { className?: string }) {
  return (
    <div className={clsx(mono, 'overflow-hidden border-y border-foam/10 py-3 text-foam/45', className)} aria-hidden="true">
      <div className="lp-marquee flex w-max" style={{ '--t': '70s' } as CSSProperties}>
        <Run />
        <Run />
      </div>
    </div>
  )
}
