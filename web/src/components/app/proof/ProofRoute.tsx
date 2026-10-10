'use client'

import { useT } from '@/lib/i18n/client'
import { dateShort } from '@/lib/format'
import { label } from '../kit/styles'

/** The route of the transfer: a thin line with a diamond at each end, the origin port and the supplier's port, with the dates. */
export function ProofRoute({
  origin,
  destination,
  paidAt,
  reconciledAt,
}: {
  origin: string
  destination: string
  paidAt: string
  reconciledAt: string | null
}) {
  const { t, locale } = useT()
  return (
    <div className="border-b border-hair px-5 py-5 sm:px-8">
      <p className={`${label} !text-ink/60`}>{t('app.proof.route')}</p>
      <div className="relative mt-4 h-px bg-ink/40" aria-hidden="true">
        <span className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rotate-45 bg-ink" />
        <span className="absolute right-0 top-1/2 size-2 -translate-y-1/2 rotate-45 bg-ink" />
      </div>
      <div className="mt-4 flex justify-between gap-6 text-[14px]">
        <div className="min-w-0">
          <p className="font-medium">{origin}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {t('app.proof.routePaid')} {dateShort(paidAt, locale)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="break-words font-medium">{destination}</p>
          {reconciledAt ? (
            <p className="mt-0.5 text-[13px] text-muted">
              {t('app.proof.routeReconciled')} {dateShort(reconciledAt, locale)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
