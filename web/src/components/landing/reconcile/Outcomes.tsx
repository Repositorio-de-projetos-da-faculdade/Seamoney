import type { ReconcileCopy } from './copy'

const ARROW = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="mt-[0.3em] size-4 shrink-0 text-brand-600">
    <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** What the reconciliation leaves behind: a proof page for the supplier and a CSV line for the accountant. */
export function Outcomes({ copy }: { copy: ReconcileCopy }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <p data-r="outcome" className="flex gap-2.5 font-grotesk text-[1.25rem] leading-[1.15] tracking-[-0.02em]">
        {ARROW}
        {copy.proof}
      </p>
      <div data-r="outcome">
        <p className="flex gap-2.5 font-grotesk text-[1.25rem] leading-[1.15] tracking-[-0.02em]">
          {ARROW}
          {copy.csv}
        </p>
        <p className="mt-2.5 pl-6 font-data text-[10px] leading-relaxed text-ink/50">
          <span className="block truncate">{copy.csvLines[0]}</span>
          <span className="block truncate">
            <span className="bg-mint/45 text-ink">{copy.reference}</span>
            {copy.csvLines[1].slice(copy.reference.length)}
          </span>
        </p>
      </div>
    </div>
  )
}
