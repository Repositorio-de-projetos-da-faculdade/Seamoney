import clsx from 'clsx'
import { label } from '../type'
import type { ReconcileCopy } from './copy'

/** The on-chain event, printed like a receipt and clipped to the invoice. Lines appear as the chapter scrolls. */
export function EventLog({ copy }: { copy: ReconcileCopy }) {
  return (
    <div data-r="log" className="rotate-[2.5deg] bg-night p-5 font-data text-[11px] text-foam shadow-[0_30px_60px_-24px_rgb(2_8_16/0.7)] md:p-6 md:text-xs">
      <p className={clsx(label, 'mb-4 flex items-center justify-between gap-6 border-b border-foam/15 pb-3 text-foam/55')}>
        {copy.eventLabel}
        <span className="flex items-center gap-2 text-mint">
          <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
          Tempo
        </span>
      </p>
      <dl className="space-y-2">
        {copy.event.map((row) => (
          <div key={row.key} data-r="line" className="grid grid-cols-[4.5rem_1fr] gap-3">
            <dt className="text-foam/40">{row.key}</dt>
            <dd className={clsx('break-all', row.tone === 'mint' ? 'text-mint' : row.tone === 'dim' ? 'text-foam/55' : 'text-foam')}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
