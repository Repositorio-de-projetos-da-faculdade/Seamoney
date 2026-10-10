import { Check } from 'lucide-react'
import type { ReconcileCopy } from './copy'

/** The five checks Seamoney runs before closing the invoice, ticked in order as the chapter scrolls. */
export function Checks({ copy }: { copy: ReconcileCopy }) {
  return (
    <ol className="border-t border-ink/15">
      {copy.checks.map((label, i) => (
        <li key={label} className="flex items-center gap-4 border-b border-ink/10 py-2.5">
          <span className="w-6 font-data text-[10px] font-medium tabular-nums text-ink/40">{String(i + 1).padStart(2, '0')}</span>
          <span className="font-text text-[15px] text-ink/85 md:text-base">{label}</span>
          <span className="relative ml-auto grid size-5 shrink-0 place-items-center overflow-hidden rounded-full border border-ink/25">
            <span data-r="fill" className="absolute inset-0 origin-left bg-brand-600" aria-hidden="true" />
            <Check data-r="tick" size={12} strokeWidth={3} className="relative text-white" aria-hidden="true" />
          </span>
        </li>
      ))}
    </ol>
  )
}
