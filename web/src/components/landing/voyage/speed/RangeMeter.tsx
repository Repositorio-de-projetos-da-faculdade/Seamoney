import clsx from 'clsx'
import { mono } from '../../type'

const pct = (n: number) => `${n * 100}%`

/**
 * One figure drawn on a shared axis: the bank wire as a hatched band over its range, Seamoney as a solid mint bar
 * from zero (a lit tick when the value is next to nothing, like a settlement in seconds). Fractions of the axis.
 */
export function RangeMeter({ axis, bank, sea }: { axis: [string, string]; bank: [number, number]; sea: number }) {
  return (
    <div aria-hidden="true">
      <div className="relative h-2.5">
        <span className="absolute inset-x-0 top-1/2 h-px bg-foam/15" />
        <span
          data-bank
          className="absolute inset-y-0 origin-left bg-[repeating-linear-gradient(-45deg,rgb(64_136_184/0.75)_0_2px,transparent_2px_5px)] ring-1 ring-inset ring-bank/60"
          style={{ left: pct(bank[0]), width: pct(bank[1] - bank[0]) }}
        />
        <span
          data-sea
          className={clsx('absolute inset-y-0 left-0 origin-left bg-mint shadow-[0_0_14px_rgb(36_228_180/0.7)]', sea === 0 && 'w-[3px]')}
          style={sea > 0 ? { width: pct(sea) } : undefined}
        />
      </div>
      <p className={clsx(mono, 'mt-2 flex justify-between text-[10px] text-foam/40')}>
        <span>{axis[0]}</span>
        <span>{axis[1]}</span>
      </p>
    </div>
  )
}
