'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

/** An on/off setting: a button with role="switch", labelled by its own text. */
export function Switch({ checked, onChange, disabled, children }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-[14.5px] text-ink transition-colors hover:bg-paper-hi focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
    >
      <span>{children}</span>
      <span aria-hidden="true" className={clsx('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-brand-600' : 'bg-ink/25')}>
        <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white transition-[left] duration-200 motion-reduce:transition-none', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}
