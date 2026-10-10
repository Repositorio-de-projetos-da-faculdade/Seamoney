'use client'

import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import { useT } from '@/lib/i18n/client'
import type { Network, PaymentStatus } from '@/lib/demo/types'

/**
 * One small mark per status, so the eye can sort a list before reading it: hollow while waiting for a person, green
 * ring when ready, the live mint dot while the network works, a filled check when closed, red when something needs a
 * person or ended without paying.
 */
export function StatusGlyph({ status, className }: { status: PaymentStatus; className?: string }) {
  const base = 'inline-grid size-[14px] shrink-0 place-items-center rounded-full'
  const mark = (() => {
    switch (status) {
      case 'pending_approval':
        return <span className={clsx(base, 'border-[1.5px] border-ink/45')} />
      case 'approved':
        return (
          <span className={clsx(base, 'border-[1.5px] border-brand-600')}>
            <span className="size-[5px] rounded-full bg-brand-600" />
          </span>
        )
      case 'sending':
        return (
          <span className={base}>
            <span className="beat size-[8px] rounded-full bg-mint" />
          </span>
        )
      case 'sent':
        return (
          <span className={base}>
            <span className="size-[8px] rounded-full bg-navy-500" />
          </span>
        )
      case 'reconciled':
        return (
          <span className={clsx(base, 'bg-brand-600 text-white')}>
            <Check size={9} strokeWidth={3.5} />
          </span>
        )
      case 'in_review':
        return (
          <span className={base}>
            <span className="size-[8px] rotate-45 bg-bad-ink" />
          </span>
        )
      case 'rejected':
        return (
          <span className={clsx(base, 'bg-bad-ink text-white')}>
            <X size={9} strokeWidth={3.5} />
          </span>
        )
      case 'cancelled':
        return (
          <span className={base}>
            <span className="h-[1.5px] w-[9px] bg-muted" />
          </span>
        )
    }
  })()
  return (
    <span aria-hidden="true" className={clsx('inline-flex', className)}>
      {mark}
    </span>
  )
}

const TONE: Record<PaymentStatus, string> = {
  pending_approval: 'text-ink',
  approved: 'text-ok-ink',
  sending: 'text-ink',
  sent: 'text-info-ink',
  reconciled: 'text-ok-ink',
  in_review: 'text-bad-ink',
  rejected: 'text-bad-ink',
  cancelled: 'text-muted',
}

export function Status({ status, className }: { status: PaymentStatus; className?: string }) {
  const { t } = useT()
  return (
    <span className={clsx('inline-flex items-center gap-2 whitespace-nowrap text-[13.5px] font-medium', TONE[status], className)}>
      <StatusGlyph status={status} />
      {t(`app.status.${status}`)}
    </span>
  )
}

/** The amber diamond the landing uses for everything simulated. Never left off a simulated figure or hash. */
export function Simulated({ children, onNight = false, className }: { children?: React.ReactNode; onNight?: boolean; className?: string }) {
  const { t } = useT()
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-data text-[10.5px] font-medium uppercase tracking-[0.08em]',
        onNight ? 'text-signal' : 'text-warn-ink',
        className,
      )}
    >
      <span className="size-[7px] shrink-0 rotate-45 bg-signal" aria-hidden="true" />
      {children ?? t('app.simulated')}
    </span>
  )
}

/** The live dot: something really happened on a testnet. */
export function Live({ children, onNight = false, className }: { children: React.ReactNode; onNight?: boolean; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-data text-[10.5px] font-medium uppercase tracking-[0.08em]',
        onNight ? 'text-mint' : 'text-ok-ink',
        className,
      )}
    >
      <span className="size-[7px] shrink-0 rounded-full bg-mint ring-1 ring-brand-600/40" aria-hidden="true" />
      {children}
    </span>
  )
}

/** Which network a payment or wallet is on. Plain lettering, no third-party logos. */
export function NetworkTag({ network, className }: { network: Network; className?: string }) {
  const { t } = useT()
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap font-data text-[11px] font-medium uppercase tracking-[0.06em] text-ink/80', className)}>
      <span className={clsx('size-[6px] shrink-0', network === 'tempo' ? 'rounded-full bg-brand-500' : 'rotate-45 bg-navy-500')} aria-hidden="true" />
      {t(`app.net.${network}`)}
    </span>
  )
}
