'use client'

import clsx from 'clsx'
import { Plus } from 'iconoir-react'
import Link from 'next/link'
import { BUTTON_WIDTH, EASE, REVEAL } from './reveal'

/**
 * The one action. On the rail it is a green circle with a plus, centred on the icon column; as the column opens the
 * same element stretches into a pill and its label fades in, so nothing jumps.
 */
export function NewPaymentButton({ label, onNavigate }: { label: string; onNavigate?: () => void }) {
  return (
    <Link
      href="/app/payments/new"
      onClick={onNavigate}
      aria-label={label}
      className={clsx(
        'ml-4 flex h-10 items-center overflow-hidden rounded-full bg-brand-600 text-white transition-[width,background-color] hover:bg-brand-700 active:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint',
        BUTTON_WIDTH,
        EASE,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center" aria-hidden="true">
        <Plus width={18} height={18} strokeWidth={2} />
      </span>
      <span className={clsx('whitespace-nowrap pr-5 font-text text-[14px] font-medium', REVEAL)} aria-hidden="true">
        {label}
      </span>
    </Link>
  )
}
