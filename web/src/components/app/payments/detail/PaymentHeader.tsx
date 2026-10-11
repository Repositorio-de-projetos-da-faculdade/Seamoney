'use client'

import clsx from 'clsx'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment, Supplier } from '@/lib/demo/types'
import { Stamp, stampDate, type StampKind } from '../../kit/Stamp'
import { NetworkTag, Status } from '../../kit/Status'
import { code, display, figure, label } from '../../kit/styles'

function stampOf(p: Payment): { kind: StampKind; at: string } | null {
  if (p.status === 'reconciled' && p.recon) return { kind: 'reconciled', at: p.recon.matchedAt }
  if (p.status === 'in_review' && p.recon) return { kind: 'review', at: p.recon.matchedAt }
  if (p.status === 'rejected' && p.rejection) return { kind: 'rejected', at: p.rejection.at }
  if (p.status === 'cancelled' && p.cancellation) return { kind: 'cancelled', at: p.cancellation.at }
  return null
}

/** Who is paid and how much, in the largest type on the page; where it stands right under it. */
export function PaymentHeader({ payment: p, supplier }: { payment: Payment; supplier: Supplier | undefined }) {
  const { t, locale } = useT()
  const stamp = stampOf(p)
  return (
    <header className={clsx('grid gap-x-8 gap-y-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end', stamp && 'xl:grid-cols-[minmax(0,1fr)_auto_auto]')}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={label}>{t('app.doc.kicker')}</span>
          <span className={clsx(code, 'text-ink')}>{p.invoiceNumber}</span>
          <NetworkTag network={p.network} />
        </p>
        <h1 className={clsx(display, 'mt-2 text-[34px] leading-[1.02] sm:text-[44px]')}>{supplier?.name ?? p.invoiceNumber}</h1>
        <div className="mt-3">
          <Status status={p.status} className="!text-[14.5px]" />
        </div>
      </div>
      {stamp ? (
        // pressed on the document between the name and the amount, never over a figure
        <div className="pointer-events-none max-xl:hidden" aria-hidden="true">
          <Stamp kind={stamp.kind} word={t(`app.stamp.${stamp.kind}`)} lines={[stampDate(stamp.at, locale), p.reference]} at={stamp.at} rotate={-7} />
        </div>
      ) : null}
      <div className="md:text-right">
        <p className={label}>{t('app.doc.amountLabel')}</p>
        <p className={clsx(figure, 'mt-1 text-[44px] leading-none text-ink sm:text-[56px]')}>{usd(p.quote.amountCents, locale)}</p>
        <p className="mt-1.5 text-[13px] text-muted">{t('app.doc.amountSub', { total: usd(p.quote.totalCents, locale) })}</p>
      </div>
    </header>
  )
}
