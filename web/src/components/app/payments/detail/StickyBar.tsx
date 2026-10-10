'use client'

import clsx from 'clsx'
import { useEffect, useState, type RefObject } from 'react'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { DemoState, Member, Payment, Supplier } from '@/lib/demo/types'
import { Status } from '../../kit/Status'
import { code, figure } from '../../kit/styles'
import { PaymentButtons, usePaymentActions } from './PaymentActions'

/** True once the element has scrolled above the top of the viewport, counting the 56px phone app bar as covering it. */
function useScrolledPast(anchor: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = anchor.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      rootMargin: '-56px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [anchor])
  return past
}

/** A slim summary that slides down from under the app bar once the payment header leaves the screen. */
export function StickyBar({
  anchor,
  state,
  me,
  payment: p,
  supplier,
}: {
  anchor: RefObject<HTMLElement | null>
  state: DemoState
  me: Member
  payment: Payment
  supplier: Supplier | undefined
}) {
  const { t, locale } = useT()
  const past = useScrolledPast(anchor)
  const a = usePaymentActions(state, me, p)
  return (
    // zero-height sticky anchor: the bar hangs from it, so it never takes up space in the flow
    <div className="sticky top-14 z-30 h-0 print:hidden lg:top-0">
      <section
        aria-label={t('app.pdoc.sticky')}
        className={clsx(
          'absolute inset-x-0 top-0 border-b border-hair bg-sheet shadow-[0_6px_18px_-12px_rgba(7,21,31,0.45)] transition-[transform,visibility] duration-200 motion-reduce:transition-none',
          past ? 'visible translate-y-0' : 'invisible -translate-y-full',
        )}
      >
        <div className="mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <p className="min-w-0 truncate font-grotesk text-[15px] font-medium text-ink">{supplier?.name ?? p.invoiceNumber}</p>
            <span className={clsx(code, 'text-muted')}>{p.invoiceNumber}</span>
            <span className={clsx(figure, 'text-[18px] tabular-nums text-ink')}>{usd(p.quote.amountCents, locale)}</span>
            <Status status={p.status} className="!text-[13px]" />
          </div>
          <PaymentButtons actions={a} small />
        </div>
      </section>
    </div>
  )
}
