import clsx from 'clsx'
import { mono } from '../../type'

/** The five checks reconciliation runs on the on-chain event, named by the event's own fields. */
const FIELDS = ['token', 'to', 'amount', 'memo', 'receipt']

/** Reconciliation has no scale to draw on: instead, the five checks light up in turn. */
export function CheckMeter() {
  return (
    <div aria-hidden="true">
      <ol className="grid h-2.5 grid-cols-5 gap-1.5">
        {FIELDS.map((field) => (
          <li key={field} data-check className="bg-mint shadow-[0_0_10px_rgb(36_228_180/0.55)]" />
        ))}
      </ol>
      <p className={clsx(mono, 'mt-2 grid grid-cols-5 gap-1.5 text-[10px] text-foam/40')}>
        {FIELDS.map((field) => (
          <span key={field} className="truncate">
            {field}
          </span>
        ))}
      </p>
    </div>
  )
}
