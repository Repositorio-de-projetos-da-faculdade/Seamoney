import type { ReactNode } from 'react'
import { encodeMemo } from '@/lib/memo'
import { SAMPLE_REFERENCE as SAMPLE } from '../sample'

// The things the copy talks about, drawn inside the sentence at the size of the text (everything is in em). Each one
// has a data-g name that lede/motion.ts animates as the reading reaches it. The accent is --lede-accent (mint on the
// night chapters, the action green on paper). Chips carry real text and are read out; the drawings are decorative.

const USED = encodeMemo(SAMPLE).used

function Chip({ name, children }: { name: string; children: string }) {
  return (
    <span
      data-g={name}
      className="mx-[0.08em] inline-flex -translate-y-[0.14em] items-center gap-[0.5em] rounded-[0.25em] border border-(--lede-accent)/45 px-[0.55em] py-[0.2em] align-middle font-data text-[0.5em] font-medium leading-none tracking-[0.06em] text-(--lede-accent)"
    >
      <span aria-hidden="true" className="size-[0.55em] rotate-45 bg-(--lede-accent)" />
      <span data-scramble>{children}</span>
    </span>
  )
}

function Drawing({ name, width, viewBox = '0 0 64 16', children }: { name: string; width: string; viewBox?: string; children: ReactNode }) {
  return (
    <svg
      data-g={name}
      aria-hidden="true"
      viewBox={viewBox}
      className="mx-[0.12em] inline-block h-[0.66em] -translate-y-[0.06em] overflow-visible align-middle text-(--lede-accent)"
      style={{ width }}
    >
      {children}
    </svg>
  )
}

/** São Paulo to Shenzhen in one arc, a payment running along it. */
const route = (
  <Drawing name="route" width="2.6em">
    <path data-draw d="M5 13 Q32 -7 59 13" pathLength={1} strokeDasharray="1 1" className="fill-none stroke-current" strokeWidth={1.6} opacity={0.8} />
    <circle cx={5} cy={13} r={2.6} className="fill-none stroke-current" strokeWidth={1.4} />
    <circle data-end cx={59} cy={13} r={3} className="fill-current" />
    <circle data-travel r={2} className="fill-white" opacity={0}>
      <animateMotion dur="2.8s" repeatCount="indefinite" path="M5 13 Q32 -7 59 13" />
    </circle>
  </Drawing>
)

/** The bank wire's port calls: three banks on a dashed line, in the bank blue. */
const hops = (
  <Drawing name="hops" width="2.6em">
    <path data-draw d="M4 8 H60" pathLength={1} strokeDasharray="1 1" className="fill-none stroke-bank" strokeWidth={1.4} />
    {[8, 32, 56].map((x) => (
      <rect key={x} data-hop x={x - 4} y={4} width={8} height={8} transform={`rotate(45 ${x} 8)`} className="fill-abyss stroke-bank" strokeWidth={1.4} />
    ))}
  </Drawing>
)

/** A check that draws itself. */
const check = (
  <Drawing name="check" width="0.7em" viewBox="0 0 16 16">
    <circle data-draw cx={8} cy={8} r={7} pathLength={1} strokeDasharray="1 1" className="fill-none stroke-current" strokeWidth={1.5} />
    <path data-draw d="M4.5 8.2 L7 10.6 L11.6 5.6" pathLength={1} strokeDasharray="1 1" className="fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Drawing>
)

/** The 32-byte memo as two rows of cells; the sample reference fills the first ones. */
const bytes = (
  <span data-g="bytes" aria-hidden="true" className="mx-[0.12em] inline-grid -translate-y-[0.08em] grid-cols-[repeat(16,0.17em)] gap-[0.05em] align-middle">
    {Array.from({ length: 32 }, (_, i) => (
      <span key={i} data-cell={i < USED ? 'used' : 'pad'} className={i < USED ? 'h-[0.24em] bg-(--lede-accent)' : 'h-[0.24em] bg-current opacity-20'} />
    ))}
  </span>
)

/** Five checks in a row, like the five things reconciliation verifies. */
const five = (
  <span data-g="five" aria-hidden="true" className="mx-[0.12em] inline-flex -translate-y-[0.08em] gap-[0.1em] align-middle">
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} data-cell="used" className="size-[0.32em] bg-(--lede-accent)" />
    ))}
  </span>
)

export const GLYPHS: Record<string, ReactNode> = {
  route,
  hops,
  check,
  bytes,
  five,
  memo: <Chip name="memo">{SAMPLE}</Chip>,
  event: <Chip name="event">TransferWithMemo</Chip>,
}
