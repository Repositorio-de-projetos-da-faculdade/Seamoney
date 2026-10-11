'use client'

import clsx from 'clsx'

export interface Segment<V extends string> {
  value: V
  label: string
  count?: number
  /** counts that ask for someone's action are set in green */
  urgent?: boolean
}

/** A row of views over one list ("Needs you", "Awaiting approval"...). Scrolls sideways on a phone, never wraps. */
export function Segments<V extends string>({ label, value, onChange, options }: { label: string; value: V; onChange: (v: V) => void; options: Segment<V>[] }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-1 border-b border-rule">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={clsx(
                'relative -mb-px inline-flex h-10 items-center gap-2 border-b-2 px-3 text-[14px] transition-colors',
                on ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {o.label}
              {o.count != null ? (
                <span
                  className={clsx(
                    'min-w-5 rounded-full px-1.5 text-center font-data text-[11px] leading-5 tabular-nums',
                    o.urgent && o.count > 0 ? 'bg-brand-600 text-white' : 'bg-ink/[0.06] text-muted',
                  )}
                >
                  {o.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
