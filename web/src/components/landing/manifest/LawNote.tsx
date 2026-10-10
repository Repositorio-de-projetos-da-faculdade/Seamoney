import clsx from 'clsx'
import { label } from '../type'

/** The legal footnote in one sentence; the full wording of the rule opens on demand (no JavaScript needed). */
export function LawNote({ short, full, more }: { short: string; full: string; more: string }) {
  return (
    <div data-row className="relative border-l-2 border-signal pl-5 md:pl-7">
      <p className={clsx(label, 'text-signal')}>BCB 561 · art. 50</p>
      <p className="mt-3 max-w-[58ch] font-text text-[1.15rem] leading-[1.5] text-foam/85 md:text-[1.3rem]">{short}</p>
      <details className="group mt-4">
        <summary
          className={clsx(
            label,
            'inline-flex cursor-pointer list-none items-center gap-2 text-foam/55 transition-colors hover:text-foam [&::-webkit-details-marker]:hidden',
          )}
        >
          <span aria-hidden="true" className="text-[14px] leading-none transition-transform duration-300 group-open:rotate-45">
            +
          </span>
          {more}
        </summary>
        <p className="mt-4 max-w-[70ch] font-text text-[15px] leading-relaxed text-foam/65 md:text-base">{full}</p>
      </details>
    </div>
  )
}
