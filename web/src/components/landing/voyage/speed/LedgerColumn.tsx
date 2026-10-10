import clsx from 'clsx'
import type { ReactNode } from 'react'
import { label } from '../../type'

export interface LedgerFigure {
  name: string
  bank: string
  sea: string
}

/**
 * One column of the crossing ledger: the bank-wire figure (struck through on scroll), the Seamoney figure rising
 * into its place, and a meter that draws the difference. The data-* hooks are animated by SpeedChapter.
 */
export function LedgerColumn({ n, figure, bankName, seaName, children }: { n: number; figure: LedgerFigure; bankName: string; seaName: string; children: ReactNode }) {
  return (
    <li data-col className="relative flex flex-col py-4 md:py-6 md:pr-10">
      <span data-rule className="absolute inset-x-0 top-0 h-px origin-left bg-foam/25 md:right-10" aria-hidden="true" />
      <p data-in className={clsx(label, 'flex items-center gap-3 text-foam/60')}>
        <span className="text-mint">{String(n).padStart(2, '0')}</span>
        {figure.name}
      </p>
      <p data-in className="mt-3 md:mt-5">
        <span className="sr-only">{bankName}: </span>
        <span data-old className="relative inline-block font-grotesk text-[1.05rem] font-light tracking-[-0.01em] text-bank-soft md:text-[1.35rem]">
          {figure.bank}
          <span data-strike className="absolute inset-x-0 top-[55%] block h-px origin-left bg-foam/80" aria-hidden="true" />
        </span>
      </p>
      <p className="overflow-hidden pb-[0.12em]">
        <span className="sr-only">{seaName}: </span>
        <span data-new className="block whitespace-nowrap font-grotesk text-[clamp(2.1rem,4vw,4.5rem)] leading-[1.02] tracking-[-0.045em] text-white">
          {figure.sea}
        </span>
      </p>
      {/* the meters need the desktop width; on phones the struck figure and the new one say it on their own */}
      <div data-in className="mt-auto pt-6 max-md:hidden">
        {children}
      </div>
    </li>
  )
}
