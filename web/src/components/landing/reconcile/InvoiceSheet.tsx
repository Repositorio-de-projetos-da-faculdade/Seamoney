import clsx from 'clsx'
import type { ReactNode } from 'react'
import { label } from '../type'
import type { ReconcileCopy } from './copy'

/** The supplier's commercial invoice as a sheet of paper: letterhead, fields, blank line items, total. */
export function InvoiceSheet({ copy, className, children }: { copy: ReconcileCopy; className?: string; children?: ReactNode }) {
  return (
    <div
      data-r="sheet"
      className={clsx(
        'relative aspect-[0.78] rotate-[-2deg] bg-paper-hi p-7 text-ink shadow-[0_1px_0_rgb(6_24_44/0.06),0_2px_6px_-2px_rgb(6_24_44/0.1),0_40px_90px_-36px_rgb(6_24_44/0.45)] md:p-10',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-ink pb-5">
        <div className="flex items-start gap-3">
          {/* a plain monogram for the sample supplier */}
          <span className="grid size-10 shrink-0 place-items-center bg-ink font-grotesk text-[13px] font-semibold tracking-[-0.02em] text-paper-hi" aria-hidden="true">
            STC
          </span>
          <div>
            <p className="font-grotesk text-[1.5rem] font-medium uppercase leading-none tracking-[-0.02em] md:text-[1.9rem]">{copy.supplier}</p>
            <p className={clsx(label, 'mt-2 text-ink/50')}>Shenzhen, CN</p>
          </div>
        </div>
        <p className={clsx(label, 'text-right text-ink/60')}>{copy.invoiceLabel}</p>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4">
        {copy.fields.map((f) => (
          <div key={f.label} className="border-l border-paper-line pl-3 first:border-l-0 first:pl-0">
            <dt className={clsx(label, 'text-[10px] text-ink/50')}>{f.label}</dt>
            <dd className="mt-1.5 font-text text-sm font-medium md:text-[15px]">
              {f.mark ? <span className="bg-mint/45 px-1 shadow-[inset_0_-2px_0_#24e4b4]">{f.value}</span> : f.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* line items, left blank: the point is the reference, not the goods */}
      <div className="mt-9 space-y-3.5" aria-hidden="true">
        {[86, 72, 79, 64].map((w) => (
          <div key={w} className="flex items-center gap-4 border-b border-paper-line pb-3.5">
            <span className="h-1.5 rounded-full bg-ink/10" style={{ width: `${w * 0.55}%` }} />
            <span className="ml-auto h-1.5 w-14 rounded-full bg-ink/10" />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-7 bottom-7 flex items-end justify-between border-t border-ink pt-4 md:inset-x-10 md:bottom-10">
        <p className={clsx(label, 'text-ink/60')}>{copy.total.label}</p>
        <p className="font-grotesk text-[2.2rem] font-light leading-none tracking-[-0.045em] md:text-[2.8rem]">{copy.total.value}</p>
      </div>
      <p className={clsx(label, 'absolute right-7 top-[-1.75rem] text-ink/45 md:right-10')}>{copy.sample}</p>
      {children}
    </div>
  )
}
